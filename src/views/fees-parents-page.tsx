import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/shared/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Banknote, CircleAlert, Receipt, Wallet } from 'lucide-react'
import { catalogService, studentService } from '@/services/api'
import { notify, runMockProcess } from '@/lib/notify'
import { formatCurrency, formatDate, formatDateTime, fullName } from '@/lib/utils'
import type { FeeStructure, Invoice, Payment, Student, Guardian } from '@/types'

export function FeesPage() {
  const [loading, setLoading] = useState(true)
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      catalogService.getFeeStructures(),
      catalogService.getInvoices(),
      catalogService.getPayments(),
      studentService.list(),
    ]).then(([fs, inv, pay, stu]) => {
      setStructures(fs)
      setInvoices(inv)
      setPayments(pay)
      setStudents(stu)
      setLoading(false)
    })
  }, [])

  const totals = useMemo(() => {
    const billed = invoices.reduce((s, i) => s + i.total, 0)
    const collected = payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((s, p) => s + p.amount, 0)
    const outstanding = invoices.reduce((s, i) => s + (i.total - i.paid), 0)
    const overdue = invoices
      .filter((i) => i.status === 'OVERDUE')
      .reduce((s, i) => s + (i.total - i.paid), 0)
    return { billed, collected, outstanding, overdue }
  }, [invoices, payments])

  if (loading) return <LoadingState message="Loading fees & payments…" />

  return (
    <div>
      <PageHeader
        title="Fees & Payments"
        description="Structures, invoices, receipts, and balances (mock — no real payments)."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Fees & Payments' }]}
        actions={
          <Button
            loading={saving}
            onClick={() => {
              void (async () => {
                setSaving(true)
                try {
                  await runMockProcess({
                    loading: 'Recording payment…',
                    success: 'Payment recorded',
                    error: 'Could not record payment',
                  })
                } finally {
                  setSaving(false)
                }
              })()
            }}
          >
            Record payment
          </Button>
        }
      />

      <Alert title="No live payment processing" tone="info" className="mb-4">
        This UI uses mock payment data only. Gateway integration comes later with Spring Boot.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total billed" value={formatCurrency(totals.billed)} icon={Receipt} />
        <StatCard
          label="Total collected"
          value={formatCurrency(totals.collected)}
          icon={Banknote}
          tone="success"
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(totals.outstanding)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Overdue"
          value={formatCurrency(totals.overdue)}
          icon={CircleAlert}
          tone="warning"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fee structures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {structures.map((fs) => (
              <div key={fs.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{fs.name}</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {fs.items.map((item) => (
                    <li key={item.name} className="flex justify-between gap-3">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student accounts / invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoices.map((inv) => {
              const student = students.find((s) => s.id === inv.studentId)
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {student ? fullName(student) : inv.studentId} · due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      {formatCurrency(inv.paid)} / {formatCurrency(inv.total)}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Payment history / receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{p.receiptNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(p.paidAt)} · {p.method}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(p.amount)}</p>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function ParentsPage() {
  const [loading, setLoading] = useState(true)
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    let mounted = true
    Promise.all([catalogService.getGuardians(), studentService.list()])
      .then(([g, s]) => {
        if (!mounted) return
        setGuardians(g)
        setStudents(s)
      })
      .catch((err) => {
        console.error(err)
        notify.error(
          'Could not load parents',
          'Firestore rules are blocking reads. Publish open rules from firestore.rules in the Firebase Console.',
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <LoadingState message="Loading guardians…" />

  return (
    <div>
      <PageHeader
        title="Parents / Guardians"
        description="Guardian contacts and linked students."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Parents/Guardians' }]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {guardians.map((g) => (
          <Card key={g.id}>
            <CardContent className="space-y-2 p-5">
              <Link to={`/parents/${g.id}`} className="font-display text-lg font-semibold text-primary">
                {g.firstName} {g.lastName}
              </Link>
              <p className="text-sm text-muted-foreground">
                {g.relationship} · {g.occupation}
              </p>
              <p className="text-sm">
                {g.email} · {g.phone}
              </p>
              <p className="text-sm text-muted-foreground">{g.address}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {g.studentIds.map((id) => {
                  const s = students.find((x) => x.id === id)
                  return s ? (
                    <Link
                      key={id}
                      to={`/students/${id}`}
                      className="rounded-full bg-secondary px-2.5 py-1 text-xs"
                    >
                      {fullName(s)}
                    </Link>
                  ) : null
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function ParentDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [guardian, setGuardian] = useState<Guardian | undefined>()
  const [students, setStudents] = useState<Student[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      catalogService.getGuardian(id),
      studentService.list(),
      catalogService.getInvoices(),
    ]).then(([g, s, inv]) => {
      setGuardian(g)
      setStudents(s.filter((x) => g?.studentIds.includes(x.id)))
      setInvoices(inv.filter((i) => g?.studentIds.includes(i.studentId)))
      setLoading(false)
    })
  }, [id])

  if (loading) return <LoadingState message="Loading guardian profile…" />
  if (!guardian) return <p>Guardian not found.</p>

  const outstanding = invoices.reduce((sum, i) => sum + (i.total - i.paid), 0)

  return (
    <div>
      <PageHeader
        title={`${guardian.firstName} ${guardian.lastName}`}
        description={`${guardian.relationship} · ${guardian.email}`}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Parents', to: '/parents' },
          { label: guardian.lastName },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{guardian.phone}</p>
            <p>{guardian.address}</p>
            <p>{guardian.occupation}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Linked students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {students.map((s) => (
              <Link key={s.id} to={`/students/${s.id}`} className="block text-primary">
                {fullName(s)}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fee summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold">{formatCurrency(outstanding)}</p>
            <p className="text-sm text-muted-foreground">Combined outstanding</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
