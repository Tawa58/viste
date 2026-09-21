import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Banknote, CircleAlert, Download, Receipt, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { SearchInput } from '@/components/shared/search-input'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/shared/alert'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableShell,
} from '@/components/shared/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { catalogService, classService, studentService } from '@/services/api'
import { notify, runMockProcess } from '@/lib/notify'
import { downloadParentsPdf, type ParentPdfVariant } from '@/lib/parents-pdf'
import { educationLevelName } from '@/lib/education-levels'
import { formatCurrency, formatDate, formatDateTime, fullName } from '@/lib/utils'
import type { FeeStructure, Invoice, Payment, SchoolClass, Student, Guardian } from '@/types'

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
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    Promise.all([
      catalogService.getGuardians(),
      studentService.list(),
      classService.list().catch(() => [] as SchoolClass[]),
    ])
      .then(([g, s, c]) => {
        if (!mounted) return
        setGuardians(g)
        setStudents(s)
        setClasses(c)
      })
      .catch((err) => {
        console.error(err)
        notify.error(
          'Could not load parents',
          'Check that you are signed in and try again.',
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const levelByStudentId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of students) {
      const cls = classes.find((c) => c.id === s.classId)
      map[s.id] =
        educationLevelName(s.educationLevelId || cls?.educationLevelId) ||
        cls?.name ||
        '—'
    }
    return map
  }, [students, classes])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return guardians
      .filter((g) => {
        if (!q) return true
        const hay = `${g.firstName} ${g.lastName} ${g.phone} ${g.email} ${g.relationship}`.toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
      )
  }, [guardians, search])

  function pdfRows() {
    return rows.map((g) => ({
      guardian: g,
      children: students.filter((s) => g.studentIds.includes(s.id)),
      levelByStudentId,
    }))
  }

  function handleDownload(variant: ParentPdfVariant) {
    try {
      downloadParentsPdf({ variant, rows: pdfRows() })
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not open PDF')
    }
  }

  if (loading) return <LoadingState message="Loading parents…" />

  return (
    <div>
      <PageHeader
        title="Parents / Guardians"
        description="Contact directory for parents and guardians linked to students."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Parents/Guardians' }]}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Export options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDownload('contacts')}>
                Contacts only (no address)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('names_address')}>
                Names and addresses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('names_contacts')}>
                Names and contacts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload('names_contacts_children')}>
                Names, contacts, children and levels
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mb-4 max-w-md">
        <SearchInput
          id="parents-search"
          name="parents-search"
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone, or email…"
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No parents found. Add a guardian when registering a student.
        </p>
      ) : (
        <DataTableShell>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Relationship</DataTableHeaderCell>
                <DataTableHeaderCell>Phone</DataTableHeaderCell>
                <DataTableHeaderCell>Email</DataTableHeaderCell>
                <DataTableHeaderCell>Children</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {rows.map((g) => {
                const children = students.filter((s) => g.studentIds.includes(s.id))
                return (
                  <DataTableRow key={g.id}>
                    <DataTableCell>
                      <Link
                        to={`/parents/${g.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {g.firstName} {g.lastName}
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {g.relationship || '—'}
                    </DataTableCell>
                    <DataTableCell className="text-sm">{g.phone || '—'}</DataTableCell>
                    <DataTableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {g.email || '—'}
                    </DataTableCell>
                    <DataTableCell className="text-xs text-muted-foreground">
                      {children.length
                        ? children
                            .map((s) => `${fullName(s)} · ${levelByStudentId[s.id] || '—'}`)
                            .join(', ')
                        : '—'}
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  )
}

export function ParentDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [guardian, setGuardian] = useState<Guardian | undefined>()
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      catalogService.getGuardian(id),
      studentService.list(),
      classService.list().catch(() => [] as SchoolClass[]),
      catalogService.getInvoices(),
    ]).then(([g, s, c, inv]) => {
      setGuardian(g)
      setStudents(s.filter((x) => g?.studentIds.includes(x.id)))
      setClasses(c)
      setInvoices(inv.filter((i) => g?.studentIds.includes(i.studentId)))
      setLoading(false)
    })
  }, [id])

  if (loading) return <LoadingState message="Loading guardian profile…" />
  if (!guardian) return <p>Guardian not found.</p>

  const outstanding = invoices.reduce((sum, i) => sum + (i.total - i.paid), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${guardian.firstName} ${guardian.lastName}`}
        description={`${guardian.relationship || 'Guardian'} · ${guardian.phone || guardian.email || 'No contact on file'}`}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Parents', to: '/parents' },
          { label: guardian.lastName },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {guardian.phone || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {guardian.email || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Address: </span>
              {guardian.address || '—'}
            </p>
            {guardian.occupation ? (
              <p>
                <span className="text-muted-foreground">Occupation: </span>
                {guardian.occupation}
              </p>
            ) : null}
            <p className="pt-2 text-xs text-muted-foreground">
              Fee outstanding across linked students:{' '}
              <span className="font-medium text-foreground">{formatCurrency(outstanding)}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students linked to this parent.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {students.map((s) => {
                  const cls = classes.find((c) => c.id === s.classId)
                  const level =
                    educationLevelName(s.educationLevelId || cls?.educationLevelId) ||
                    cls?.name ||
                    '—'
                  return (
                    <li key={s.id} className="flex items-baseline justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link
                          to={`/students/${s.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {fullName(s)}
                        </Link>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                          {level}
                          {cls?.name ? ` · ${cls.name}` : ''}
                          {s.studentNumber || s.admissionNumber
                            ? ` · ${s.studentNumber || s.admissionNumber}`
                            : ''}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
