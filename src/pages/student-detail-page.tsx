import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/shared/alert'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { catalogService, studentService } from '@/services/api'
import { formatCurrency, formatDate, fullName } from '@/lib/utils'
import type {
  AttendanceRecord,
  Guardian,
  Invoice,
  Mark,
  SchoolClass,
  Stream,
  Student,
} from '@/types'

export function StudentDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<Student | undefined>()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [marks, setMarks] = useState<Mark[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      studentService.getById(id),
      catalogService.getClasses(),
      catalogService.getStreams(),
      catalogService.getGuardians(),
      catalogService.getAttendance(),
      catalogService.getInvoices(),
      catalogService.getMarks(),
    ]).then(([s, c, st, g, a, inv, m]) => {
      setStudent(s)
      setClasses(c)
      setStreams(st)
      setGuardians(g.filter((x) => s?.guardianIds.includes(x.id)))
      setAttendance(a.filter((x) => x.studentId === id))
      setInvoices(inv.filter((x) => x.studentId === id))
      setMarks(m.filter((x) => x.studentId === id))
      setLoading(false)
    })
  }, [id])

  if (loading) return <LoadingState />
  if (!student) {
    return (
      <Alert title="Student not found" tone="danger">
        <Link to="/students" className="underline">
          Back to students
        </Link>
      </Alert>
    )
  }

  const cls = classes.find((c) => c.id === student.classId)?.name ?? '—'
  const stream = streams.find((s) => s.id === student.streamId)?.name ?? '—'
  const present = attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length
  const attendancePct = attendance.length
    ? Math.round((present / attendance.length) * 100)
    : 0
  const outstanding = invoices.reduce((sum, i) => sum + (i.total - i.paid), 0)

  return (
    <div>
      <PageHeader
        title={fullName(student)}
        description={`${student.studentNumber} · ${cls} ${stream}`}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Students', to: '/students' },
          { label: fullName(student) },
        ]}
        actions={
          <Button variant="outline" asChild>
            <Link to="/students">Back</Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={fullName(student)} className="h-14 w-14 text-base" />
            <div>
              <p className="font-display text-xl font-semibold">{fullName(student)}</p>
              <p className="text-sm text-muted-foreground">
                Admitted {formatDate(student.admissionDate)} · {student.gender}
              </p>
            </div>
          </div>
          <StatusBadge status={student.status} />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Admission: {student.admissionNumber}</p>
                <p>Email: {student.email ?? '—'}</p>
                <p>Phone: {student.phone ?? '—'}</p>
                <p>Address: {student.address}</p>
                <p>DOB: {formatDate(student.dateOfBirth)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Attendance summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold">{attendancePct}%</p>
                <p className="text-sm text-muted-foreground">{attendance.length} recorded sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Fee summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-3xl font-semibold">{formatCurrency(outstanding)}</p>
                <p className="text-sm text-muted-foreground">Outstanding balance</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border p-3 text-sm">
                2025/2026 · {cls} {stream} <Badge className="ml-2">Current</Badge>
              </div>
              <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                2024/2025 · Form 2A
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="space-y-2 p-5">
              {attendance.length === 0 && (
                <p className="text-sm text-muted-foreground">No attendance records.</p>
              )}
              {attendance.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{formatDate(a.date)}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardContent className="space-y-2 p-5">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p>
                      {formatCurrency(inv.paid)} / {formatCurrency(inv.total)}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardContent className="space-y-2 p-5">
              {marks.length === 0 && (
                <p className="text-sm text-muted-foreground">No marks available.</p>
              )}
              {marks.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    Score {m.score} · Grade {m.grade}
                  </span>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians">
          <div className="grid gap-4 md:grid-cols-2">
            {guardians.map((g) => (
              <Card key={g.id}>
                <CardHeader>
                  <CardTitle>
                    {g.firstName} {g.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{g.relationship}</p>
                  <p>{g.email}</p>
                  <p>{g.phone}</p>
                  <p className="text-muted-foreground">{g.address}</p>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link to={`/parents/${g.id}`}>Open guardian</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-5">
              <EmptyDocs />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyDocs() {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
      <p className="font-medium">No documents uploaded</p>
      <p className="mt-1 text-sm text-muted-foreground">
        File storage will connect to Spring Boot later.
      </p>
    </div>
  )
}
