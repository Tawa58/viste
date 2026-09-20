import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardList, Download, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableShell,
} from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { downloadAttendanceRegisterPdf } from '@/lib/attendance-pdf'
import { notify } from '@/lib/notify'
import { catalogService, classService, studentService } from '@/services/api'
import { cn, fullName } from '@/lib/utils'
import type {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  SchoolClass,
  Student,
} from '@/types'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function isAdminRole(role: string | undefined) {
  return role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'PRINCIPAL' || role === 'REGISTRAR'
}

export function AttendancePage() {
  const { user } = useAuth()
  const isAdmin = isAdminRole(user?.role)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [date, setDate] = useState(todayIso())
  const [classId, setClassId] = useState('')
  const [marks, setMarks] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({})
  const [session, setSession] = useState<AttendanceSession | null>(null)
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [adminDate, setAdminDate] = useState(todayIso())
  const [viewingSession, setViewingSession] = useState<{
    session: AttendanceSession
    records: AttendanceRecord[]
    students: Student[]
  } | null>(null)

  async function loadBase() {
    const [stu, cls] = await Promise.all([studentService.list(), classService.list()])
    setStudents(stu)
    setClasses(cls.filter((c) => (c.status ?? 'ACTIVE') === 'ACTIVE'))
    setClassId((prev) => {
      if (prev && cls.some((c) => c.id === prev)) return prev
      return cls.find((c) => (c.status ?? 'ACTIVE') === 'ACTIVE')?.id ?? ''
    })
  }

  async function loadRegister(forDate: string, forClassId: string) {
    if (!forClassId) {
      setMarks({})
      setSession(null)
      return
    }
    try {
      const [records, sessList] = await Promise.all([
        catalogService.getAttendance({ date: forDate, classId: forClassId, kind: 'DAILY' }),
        catalogService.getAttendanceSessions({ date: forDate, classId: forClassId }),
      ])
      const next: Record<string, 'PRESENT' | 'ABSENT'> = {}
      for (const r of records) {
        next[r.studentId] = r.status === 'ABSENT' ? 'ABSENT' : 'PRESENT'
      }
      setMarks(next)
      setSession(sessList[0] ?? null)
    } catch (err) {
      console.error(err)
      setMarks({})
      setSession(null)
      notify.error('Could not load register for this class')
    }
  }

  async function loadAdminSessions(forDate: string) {
    if (!isAdmin) return
    try {
      const list = await catalogService.getAttendanceSessions({ date: forDate })
      setSessions(list)
    } catch (err) {
      console.error(err)
      setSessions([])
      notify.error('Could not load submitted registers')
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await loadBase()
        if (isAdmin) await loadAdminSessions(adminDate)
      } catch (err) {
        console.error(err)
        notify.error('Could not load attendance')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!classId) return
    void loadRegister(date, classId).catch((err) => {
      console.error(err)
      notify.error('Could not load register for this class')
    })
  }, [date, classId])

  useEffect(() => {
    if (!isAdmin) return
    void loadAdminSessions(adminDate).catch(console.error)
  }, [adminDate, isAdmin])

  const roster = useMemo(
    () =>
      students
        .filter((s) => s.classId === classId && s.status === 'ACTIVE')
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [students, classId],
  )

  const selectedClass = classes.find((c) => c.id === classId)
  /** Once submitted for this class+date, marks are read-only until the next calendar day. */
  const registerLocked = Boolean(session)

  const stats = useMemo(() => {
    const values = roster.map((s) => marks[s.id] ?? null)
    const marked = values.filter(Boolean) as ('PRESENT' | 'ABSENT')[]
    const present = marked.filter((v) => v === 'PRESENT').length
    const absent = marked.filter((v) => v === 'ABSENT').length
    const unmarked = roster.length - marked.length
    const pct = marked.length ? Math.round((present / marked.length) * 100) : 0
    return { present, absent, unmarked, pct, total: roster.length }
  }, [roster, marks])

  function markAll(status: 'PRESENT' | 'ABSENT') {
    if (registerLocked) return
    const next: Record<string, 'PRESENT' | 'ABSENT'> = {}
    for (const s of roster) next[s.id] = status
    setMarks(next)
  }

  async function submitRegister() {
    if (registerLocked) {
      notify.error(
        'Register locked',
        'This day’s register is already submitted. Take attendance again on the next calendar day.',
      )
      return
    }
    if (!classId || !selectedClass) {
      notify.error('Select a class')
      return
    }
    if (roster.length === 0) {
      notify.error('No active students in this class')
      return
    }
    const missing = roster.filter((s) => !marks[s.id])
    if (missing.length > 0) {
      notify.error(
        'Mark every student',
        `${missing.length} student(s) still need Present or Absent.`,
      )
      return
    }
    setSaving(true)
    try {
      const result = await notify.process(
        () =>
          catalogService.submitDailyRegister({
            date,
            classId,
            entries: roster.map((s) => ({
              studentId: s.id,
              streamId: s.streamId || s.classId,
              status: marks[s.id]!,
            })),
          }),
        {
          loading: 'Submitting daily register…',
          success: 'Register submitted — visible to admin',
          error: 'Could not submit register',
        },
      )
      setSession(result.session)
      if (isAdmin) await loadAdminSessions(adminDate)
    } finally {
      setSaving(false)
    }
  }

  function exportPdf(opts?: {
    className: string
    date: string
    rows: { student: Student; status: AttendanceStatus }[]
    teacherName?: string
    submittedAt?: string
  }) {
    const payload = opts ?? {
      className: selectedClass?.name ?? 'Class',
      date,
      teacherName: user?.name,
      submittedAt: session?.submittedAt
        ? new Date(session.submittedAt).toLocaleString()
        : undefined,
      rows: roster.map((s) => ({
        student: s,
        status: (marks[s.id] ?? 'ABSENT') as AttendanceStatus,
      })),
    }
    downloadAttendanceRegisterPdf({
      schoolName: 'Viste High School',
      ...payload,
    })
  }

  async function openSession(sess: AttendanceSession) {
    const [records, allStudents] = await Promise.all([
      catalogService.getAttendance({
        date: sess.date,
        classId: sess.classId,
        kind: 'DAILY',
      }),
      studentService.list(),
    ])
    const byId = new Map(allStudents.map((s) => [s.id, s]))
    setViewingSession({
      session: sess,
      records,
      students: records
        .map((r) => byId.get(r.studentId))
        .filter(Boolean) as Student[],
    })
  }

  if (loading) return <LoadingState message="Loading daily register…" />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily attendance"
        description={
          isAdmin
            ? 'Teachers submit class registers; admins review and download PDFs.'
            : 'Mark Present / Absent for your assigned class, then submit the register.'
        }
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Attendance' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={roster.length === 0}
              onClick={() => exportPdf()}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              loading={saving}
              disabled={registerLocked || roster.length === 0}
              onClick={() => void submitRegister()}
            >
              {registerLocked ? 'Register submitted' : 'Submit register'}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Marked attendance', value: `${stats.pct}%` },
          { label: 'Present', value: stats.present },
          { label: 'Absent', value: stats.absent },
          { label: 'Unmarked', value: stats.unmarked },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-display text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="att-date">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-1 lg:col-span-2">
            <Label htmlFor="att-class">Class</Label>
            <Select
              id="att-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {user?.role === 'TEACHER' && classes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No classes assigned to you yet. Ask admin to set you as class teacher.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={registerLocked || roster.length === 0}
              onClick={() => markAll('PRESENT')}
            >
              Mark all present
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={registerLocked || roster.length === 0}
              onClick={() => markAll('ABSENT')}
            >
              Mark all absent
            </Button>
          </div>
        </CardContent>
      </Card>

      {session ? (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <span className="font-semibold">Locked for this day.</span> Submitted{' '}
          {new Date(session.submittedAt).toLocaleString()}
          {session.submittedByName ? ` by ${session.submittedByName}` : ''} ·{' '}
          {session.presentCount} present / {session.absentCount} absent. You can mark a new
          register for this class on the next calendar day.
        </p>
      ) : null}

      {!classId ? (
        <EmptyState
          icon={ClipboardList}
          title="Select a class"
          description="Choose a class to open today’s register."
        />
      ) : roster.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No students in this class"
          description="Register students into this class before taking attendance."
        />
      ) : (
        <DataTableShell>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="w-12">#</DataTableHeaderCell>
                <DataTableHeaderCell>Name &amp; surname</DataTableHeaderCell>
                <DataTableHeaderCell>Student no.</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Mark</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {roster.map((s, index) => {
                const status = marks[s.id]
                return (
                  <DataTableRow key={s.id}>
                    <DataTableCell className="text-muted-foreground">{index + 1}</DataTableCell>
                    <DataTableCell className="font-medium">{fullName(s)}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">
                      {s.studentNumber || s.admissionNumber}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={registerLocked}
                          variant={status === 'PRESENT' ? 'default' : 'outline'}
                          className={cn(
                            status === 'PRESENT' && 'bg-success text-success-foreground hover:bg-success/90',
                          )}
                          onClick={() =>
                            setMarks((prev) => ({ ...prev, [s.id]: 'PRESENT' }))
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          Present
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={registerLocked}
                          variant={status === 'ABSENT' ? 'default' : 'outline'}
                          className={cn(
                            status === 'ABSENT' &&
                              'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                          )}
                          onClick={() =>
                            setMarks((prev) => ({ ...prev, [s.id]: 'ABSENT' }))
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                          Absent
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}

      {isAdmin ? (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Submitted registers</h2>
              <p className="text-sm text-muted-foreground">
                Daily attendance from all classes — open or download as PDF.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-att-date">Date</Label>
              <Input
                id="admin-att-date"
                type="date"
                value={adminDate}
                onChange={(e) => setAdminDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registers submitted for this date yet.</p>
          ) : (
            <DataTableShell>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Class</DataTableHeaderCell>
                    <DataTableHeaderCell>Submitted</DataTableHeaderCell>
                    <DataTableHeaderCell>By</DataTableHeaderCell>
                    <DataTableHeaderCell>Present</DataTableHeaderCell>
                    <DataTableHeaderCell>Absent</DataTableHeaderCell>
                    <DataTableHeaderCell>Total</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {sessions.map((sess) => (
                    <DataTableRow key={sess.id}>
                      <DataTableCell className="font-medium">
                        {sess.className ?? sess.classId}
                      </DataTableCell>
                      <DataTableCell className="text-muted-foreground">
                        {new Date(sess.submittedAt).toLocaleString()}
                      </DataTableCell>
                      <DataTableCell>{sess.submittedByName ?? '—'}</DataTableCell>
                      <DataTableCell>{sess.presentCount}</DataTableCell>
                      <DataTableCell>{sess.absentCount}</DataTableCell>
                      <DataTableCell>{sess.totalCount}</DataTableCell>
                      <DataTableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void openSession(sess)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void openSession(sess).then(() => {
                                /* viewingSession set; user clicks Download PDF there */
                              })
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableShell>
          )}

          {viewingSession ? (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {viewingSession.session.className} · {viewingSession.session.date}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Submitted {new Date(viewingSession.session.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const byId = new Map(
                          viewingSession.students.map((s) => [s.id, s]),
                        )
                        exportPdf({
                          className: viewingSession.session.className ?? 'Class',
                          date: viewingSession.session.date,
                          teacherName: viewingSession.session.submittedByName,
                          submittedAt: new Date(
                            viewingSession.session.submittedAt,
                          ).toLocaleString(),
                          rows: viewingSession.records
                            .map((r) => {
                              const student = byId.get(r.studentId)
                              if (!student) return null
                              return { student, status: r.status }
                            })
                            .filter(Boolean) as { student: Student; status: AttendanceStatus }[],
                        })
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setViewingSession(null)}>
                      Close
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {viewingSession.records.map((r) => {
                    const student = viewingSession.students.find((s) => s.id === r.studentId)
                    return (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <span>{student ? fullName(student) : r.studentId}</span>
                        <StatusBadge status={r.status} />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
