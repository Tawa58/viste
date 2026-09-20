import 'server-only'

import { getAdminDb } from '@/lib/firebase/admin'
import { writeAuditLog } from '@/server/audit/logger'
import type { SessionContext } from '@/server/auth/session'
import { requirePermission } from '@/server/authorization/permissions'
import { assertCanAccessStudent, listAccessibleStudents } from '@/server/authorization/isolation'
import { badRequest, conflict, notFound } from '@/server/errors'
import { getDoc, newId, queryCollection } from '@/server/repositories/firestore-repo'
import type { PaymentCreateInput } from '@/server/validators/school'
import type { Invoice, Payment } from '@/types'

export type InvoiceDto = Invoice
export type PaymentDto = Payment

function invoiceStatus(total: number, paid: number, dueDate: string): Invoice['status'] {
  if (paid <= 0) {
    return Date.parse(dueDate) < Date.now() ? 'OVERDUE' : 'OPEN'
  }
  if (paid >= total) return 'PAID'
  return Date.parse(dueDate) < Date.now() ? 'OVERDUE' : 'PARTIAL'
}

/** Server-authoritative paid sum from CONFIRMED payments only. */
export async function computeConfirmedPaid(invoiceId: string): Promise<number> {
  const snap = await getAdminDb()
    .collection('payments')
    .where('invoiceId', '==', invoiceId)
    .where('status', '==', 'CONFIRMED')
    .get()

  return snap.docs.reduce((sum, d) => {
    const amount = (d.data() as Payment).amount
    return sum + (typeof amount === 'number' ? amount : 0)
  }, 0)
}

export async function listInvoices(
  session: SessionContext,
  studentId?: string,
): Promise<InvoiceDto[]> {
  requirePermission(session, 'fees.read')

  if (studentId) {
    await assertCanAccessStudent(session, studentId)
    return queryCollection<Invoice>('invoices', {
      limit: 100,
      where: [{ field: 'studentId', op: '==', value: studentId }],
    })
  }

  if (session.role === 'PARENT' || session.role === 'STUDENT') {
    const students = await listAccessibleStudents(session)
    const ids = new Set(students.map((s) => s.id))
    const all = await queryCollection<Invoice>('invoices', { limit: 100 })
    return all.filter((inv) => ids.has(inv.studentId))
  }

  return queryCollection<Invoice>('invoices', { limit: 100 })
}

export async function listPayments(
  session: SessionContext,
  studentId?: string,
): Promise<PaymentDto[]> {
  requirePermission(session, 'payments.read')

  if (studentId) {
    await assertCanAccessStudent(session, studentId)
    return queryCollection<Payment>('payments', {
      limit: 100,
      where: [{ field: 'studentId', op: '==', value: studentId }],
    })
  }

  if (session.role === 'PARENT' || session.role === 'STUDENT') {
    const students = await listAccessibleStudents(session)
    const ids = new Set(students.map((s) => s.id))
    const all = await queryCollection<Payment>('payments', { limit: 100 })
    return all.filter((p) => ids.has(p.studentId))
  }

  return queryCollection<Payment>('payments', { limit: 100 })
}

/**
 * Create a CONFIRMED payment inside a transaction.
 * - Rejects duplicate receiptNumber
 * - Never trusts client totals; recalculates invoice.paid from CONFIRMED payments
 */
export async function createPayment(
  session: SessionContext,
  input: PaymentCreateInput,
  requestId?: string,
): Promise<{ payment: PaymentDto; invoice: InvoiceDto }> {
  requirePermission(session, 'payments.create')
  await assertCanAccessStudent(session, input.studentId)

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw badRequest('Payment amount must be a positive number')
  }

  const db = getAdminDb()
  const receipt = input.receiptNumber.trim()

  const result = await db.runTransaction(async (tx) => {
    const invoiceRef = db.collection('invoices').doc(input.invoiceId)
    const invoiceSnap = await tx.get(invoiceRef)
    if (!invoiceSnap.exists) throw notFound('Invoice not found')
    const invoice = { id: invoiceSnap.id, ...(invoiceSnap.data() as Omit<Invoice, 'id'>) }

    if (invoice.studentId !== input.studentId) {
      throw badRequest('Invoice does not belong to the given student')
    }

    // All reads before writes (Firestore transaction rule)
    const dupSnap = await tx.get(
      db.collection('payments').where('receiptNumber', '==', receipt).limit(1),
    )
    if (!dupSnap.empty) throw conflict('Duplicate receiptNumber')

    const confirmedSnap = await tx.get(
      db
        .collection('payments')
        .where('invoiceId', '==', input.invoiceId)
        .where('status', '==', 'CONFIRMED'),
    )

    let paid = input.amount
    for (const d of confirmedSnap.docs) {
      paid += (d.data() as Payment).amount ?? 0
    }

    const paymentId = newId('pay')
    const paymentRef = db.collection('payments').doc(paymentId)
    const payment: Payment = {
      id: paymentId,
      studentId: input.studentId,
      invoiceId: input.invoiceId,
      amount: input.amount,
      method: input.method,
      status: 'CONFIRMED',
      paidAt: input.paidAt ?? new Date().toISOString(),
      receiptNumber: receipt,
    }

    const nextInvoice: Invoice = {
      ...invoice,
      paid,
      status: invoiceStatus(invoice.total, paid, invoice.dueDate),
    }

    tx.set(paymentRef, payment)
    tx.set(invoiceRef, nextInvoice)

    return { payment, invoice: nextInvoice }
  })

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'payment.create',
    entityType: 'payments',
    entityId: result.payment.id,
    requestId,
    metadata: {
      invoiceId: input.invoiceId,
      amount: input.amount,
      receiptNumber: receipt,
    },
  })

  return result
}

export async function getInvoice(session: SessionContext, id: string): Promise<InvoiceDto> {
  requirePermission(session, 'fees.read')
  const invoice = await getDoc<Invoice>('invoices', id)
  if (!invoice) throw notFound('Invoice not found')
  await assertCanAccessStudent(session, invoice.studentId)
  return invoice
}

/** Fee clearance: PAID or outstanding === 0 (using server paid sum). */
export async function isFeeCleared(studentId: string): Promise<boolean> {
  const invoices = await getAdminDb()
    .collection('invoices')
    .where('studentId', '==', studentId)
    .get()

  if (invoices.empty) return true

  for (const doc of invoices.docs) {
    const inv = doc.data() as Invoice
    const paid = await computeConfirmedPaid(doc.id)
    const outstanding = Math.max(0, (inv.total ?? 0) - paid)
    if (inv.status !== 'PAID' && outstanding > 0) return false
  }
  return true
}

export async function reversePayment(
  session: SessionContext,
  paymentId: string,
  requestId?: string,
): Promise<PaymentDto> {
  requirePermission(session, 'payments.reverse')
  const db = getAdminDb()

  const result = await db.runTransaction(async (tx) => {
    const paymentRef = db.collection('payments').doc(paymentId)
    const paymentSnap = await tx.get(paymentRef)
    if (!paymentSnap.exists) throw notFound('Payment not found')
    const payment = { id: paymentSnap.id, ...(paymentSnap.data() as Omit<Payment, 'id'>) }

    if (payment.status !== 'CONFIRMED') {
      throw badRequest('Only CONFIRMED payments can be reversed')
    }

    const invoiceRef = db.collection('invoices').doc(payment.invoiceId)
    const invoiceSnap = await tx.get(invoiceRef)
    if (!invoiceSnap.exists) throw notFound('Invoice not found')
    const invoice = { id: invoiceSnap.id, ...(invoiceSnap.data() as Omit<Invoice, 'id'>) }

    const confirmedSnap = await tx.get(
      db
        .collection('payments')
        .where('invoiceId', '==', payment.invoiceId)
        .where('status', '==', 'CONFIRMED'),
    )

    let paid = 0
    for (const d of confirmedSnap.docs) {
      if (d.id === paymentId) continue
      paid += (d.data() as Payment).amount ?? 0
    }

    const reversed: Payment = { ...payment, status: 'REVERSED' }
    const nextInvoice: Invoice = {
      ...invoice,
      paid,
      status: invoiceStatus(invoice.total, paid, invoice.dueDate),
    }

    tx.set(paymentRef, reversed)
    tx.set(invoiceRef, nextInvoice)
    return reversed
  })

  await writeAuditLog({
    actorId: session.uid,
    actorRole: session.role,
    action: 'payment.reverse',
    entityType: 'payments',
    entityId: paymentId,
    requestId,
  })

  return result
}

export const listInvoicesService = listInvoices
export const listPaymentsService = listPayments
export const createPaymentService = createPayment
export const reversePaymentService = async (
  session: SessionContext,
  id: string | string[] | undefined,
  requestId?: string,
) => {
  const paymentId = Array.isArray(id) ? id[0] : id
  if (!paymentId) throw notFound('Payment id required')
  return reversePayment(session, paymentId, requestId)
}
