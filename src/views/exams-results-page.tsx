import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/shared/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import { catalogService, classService, studentService } from '@/services/api'
import { notify, runMockProcess } from '@/lib/notify'
import { fullName } from '@/lib/utils'
import type {
  Assessment,
  Examination,
  Mark,
  ResultPortalView,
  SchoolClass,
  Staff,
  Student,
  Subject,
} from '@/types'

const workflow = ['Marks Entry', 'Submitted', 'Under Review', 'Approved', 'Published'] as const

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function ExaminationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [exams, setExams] = useState<Examination[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState('')

  useEffect(() => {
    Promise.all([
      catalogService.getExaminations(),
      catalogService.getAssessments(),
      catalogService.getMarks(),
      studentService.list(),
    ]).then(([e, a, m, s]) => {
      setExams(e)
      setAssessments(a)
      setMarks(m)
      setStudents(s)
      setSelected(a[0]?.id ?? '')
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState message="Loading examinations…" />
  const assessment = assessments.find((a) => a.id === selected)

  async function runExamAction(action: string, messages: { loading: string; success: string }) {
    setBusyAction(action)
    try {
      await runMockProcess(messages)
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Examinations"
        description="Monthly end-of-month tests, assessments, and approval workflow."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Examinations' }]}
      />

      <MonthlyMarksPanel
        onSaved={async () => {
          const [a, m] = await Promise.all([
            catalogService.getAssessments(),
            catalogService.getMarks(),
          ])
          setAssessments(a)
          setMarks(m)
        }}
      />

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          {workflow.map((step, index) => (
            <div key={step} className="flex items-center gap-2 text-sm">
              <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                {step}
              </span>
              {index < workflow.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Exam periods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No exam periods yet.</p>
            ) : (
              exams.map((e) => (
                <div key={e.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-muted-foreground">
                    {e.startDate} → {e.endDate}
                  </p>
                  <StatusBadge status={e.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Assessment marks</CardTitle>
            <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-56">
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </CardHeader>
          <CardContent>
            {assessment ? (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {assessment.type} · max {assessment.maxScore} ·{' '}
                  <StatusBadge status={assessment.status} />
                </p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-muted/60 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marks
                        .filter((m) => m.assessmentId === assessment.id)
                        .map((m) => {
                          const student = students.find((s) => s.id === m.studentId)
                          return (
                            <tr key={m.id} className="border-t border-border">
                              <td className="px-4 py-3">
                                {student ? fullName(student) : m.studentId}
                              </td>
                              <td className="px-4 py-3">{m.score}</td>
                              <td className="px-4 py-3 font-medium">{m.grade}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={m.status} />
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No assessments yet.</p>
            )}
            {user?.role !== 'STUDENT' ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  loading={busyAction === 'submit'}
                  onClick={() =>
                    void runExamAction('submit', {
                      loading: 'Submitting marks…',
                      success: 'Marks submitted',
                    })
                  }
                >
                  Submit
                </Button>
                <Button
                  variant="outline"
                  loading={busyAction === 'approve'}
                  onClick={() =>
                    void runExamAction('approve', {
                      loading: 'Approving marks…',
                      success: 'Marks approved',
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="accent"
                  loading={busyAction === 'publish'}
                  onClick={() =>
                    void runExamAction('publish', {
                      loading: 'Publishing results…',
                      success: 'Results published',
                    })
                  }
                >
                  Publish
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MonthlyMarksPanel({ onSaved }: { onSaved: () => Promise<void> }) {
  const { user } = useAuth()
  const isTeacher = user?.role === 'TEACHER'
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [staffSelf, setStaffSelf] = useState<Staff | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [scores, setScores] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [publish, setPublish] = useState(true)

  useEffect(() => {
    void (async () => {
      const [cls, subs, stu] = await Promise.all([
        classService.list(),
        catalogService.getSubjects(),
        studentService.list(),
      ])
      let me: Staff | null = null
      if (user?.staffId) {
        me = (await catalogService.getStaffMember(user.staffId)) ?? null
      }
      setStaffSelf(me)
      const activeClasses = cls.filter((c) => (c.status ?? 'ACTIVE') === 'ACTIVE')
      const allowedClasses = me
        ? activeClasses.filter((c) => (me.classIds ?? []).includes(c.id))
        : activeClasses
      const allowedSubjects = me
        ? subs.filter((s) => (me.subjectIds ?? []).includes(s.id))
        : subs
      setClasses(isTeacher ? allowedClasses : activeClasses)
      setSubjects(isTeacher ? allowedSubjects : allowedSubjects.length ? allowedSubjects : subs)
      setStudents(stu)
      setClassId((prev) => prev || allowedClasses[0]?.id || activeClasses[0]?.id || '')
      setSubjectId((prev) => prev || allowedSubjects[0]?.id || subs[0]?.id || '')
    })()
  }, [user?.staffId, isTeacher])

  const roster = useMemo(
    () =>
      students
        .filter((s) => s.classId === classId && s.status === 'ACTIVE')
        .sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [students, classId],
  )

  async function submit(publishNow: boolean) {
    if (!classId || !subjectId) {
      notify.error('Select class and subject')
      return
    }
    const entries = roster
      .map((s) => ({ studentId: s.id, score: Number(scores[s.id]) }))
      .filter((e) => Number.isFinite(e.score))
    if (entries.length === 0) {
      notify.error('Enter at least one score')
      return
    }
    setSaving(true)
    try {
      await notify.process(
        () =>
          catalogService.submitMonthlyMarks({
            classId,
            subjectId,
            month,
            maxScore: 100,
            publish: publishNow,
            entries,
          }),
        {
          loading: publishNow ? 'Saving and publishing…' : 'Saving monthly marks…',
          success: publishNow
            ? 'Monthly marks saved and visible on student portal'
            : 'Monthly marks saved as draft',
          error: 'Could not save monthly marks',
        },
      )
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  if (isTeacher && classes.length === 0) {
    return (
      <Alert title="No teaching assignments" tone="warning">
        Ask an admin to assign subjects and classes on your teacher profile before recording monthly
        tests.
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>End-of-month tests</CardTitle>
        <p className="text-sm text-muted-foreground">
          Record scores for your assigned class and subject. Grades are assigned automatically from
          the school grading scale.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {staffSelf && isTeacher ? (
          <p className="text-xs text-muted-foreground">
            Your assignments: subjects{' '}
            {(staffSelf.subjectIds ?? [])
              .map((id) => subjects.find((s) => s.id === id)?.name)
              .filter(Boolean)
              .join(', ') || '—'}
            ; classes{' '}
            {(staffSelf.classIds ?? [])
              .map((id) => classes.find((c) => c.id === id)?.name)
              .filter(Boolean)
              .join(', ') || '—'}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active students in this class.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Score (/100)</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s, i) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{fullName(s)}</td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="w-28"
                        value={scores[s.id] ?? ''}
                        onChange={(e) =>
                          setScores((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
            />
            Publish to student portal
          </label>
          <Button loading={saving} onClick={() => void submit(publish)}>
            Save monthly marks
          </Button>
          <Button
            variant="outline"
            loading={saving}
            disabled={saving}
            onClick={() => void submit(false)}
          >
            Save as draft
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ResultsPage() {
  const { user } = useAuth()
  const isStudent = user?.role === 'STUDENT'
  const [loading, setLoading] = useState(true)
  const [portals, setPortals] = useState<ResultPortalView[]>([])
  const [view, setView] = useState<ResultPortalView | null>(null)
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        if (isStudent && user?.studentId) {
          const portal = await catalogService.getResultPortal(user.studentId)
          if (!mounted) return
          setView(portal)
          setPortals([portal])
          setSelectedId(portal.studentId)
        } else {
          const rows = await catalogService.getResultPortals()
          if (!mounted) return
          setPortals(rows)
          setSelectedId(rows[0]?.studentId ?? '')
          setView(rows[0] ?? null)
        }
      } catch (err) {
        console.error(err)
        if (isStudent && user?.studentId) {
          try {
            const portal = await catalogService.getResultPortal(user.studentId)
            if (mounted) {
              setView(portal)
              setPortals([portal])
            }
          } catch (e2) {
            console.error(e2)
            notify.error('Could not load results')
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [isStudent, user?.studentId])

  useEffect(() => {
    if (isStudent || !selectedId) return
    void catalogService
      .getResultPortal(selectedId)
      .then(setView)
      .catch((err) => console.error(err))
  }, [selectedId, isStudent])

  if (loading) return <LoadingState message="Loading results portal…" />

  if (isStudent) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="My progress"
          description="Your published monthly test results and subject scores."
          breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Results' }]}
        />
        {view ? <StudentProgressCard view={view} /> : (
          <Alert title="No results yet" tone="info">
            When your teachers publish monthly tests, they will appear here.
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Results"
        description="Result summaries and student / parent portal views."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Results' }]}
      />

      <Tabs defaultValue="portal">
        <TabsList>
          <TabsTrigger value="portal">Student progress</TabsTrigger>
          <TabsTrigger value="admin">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="admin">
          <Card>
            <CardContent className="space-y-3 p-5">
              {portals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Open a student below to load their portal, or publish monthly marks first.
                </p>
              ) : (
                portals.map((p) => (
                  <div
                    key={p.studentId}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{p.studentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.className} {p.streamName} · {p.term}
                      </p>
                    </div>
                    <StatusBadge status={p.accessState} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal">
          <div className="mb-4">
            <Label className="mb-1.5 block">Student</Label>
            <Select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="max-w-sm"
            >
              <option value="">Select student</option>
              {/* Prefer loading via student list when portals empty */}
              {portals.map((p) => (
                <option key={p.studentId} value={p.studentId}>
                  {p.studentName} · {p.accessState}
                </option>
              ))}
            </Select>
            <StudentPicker
              selectedId={selectedId}
              onPick={(id) => setSelectedId(id)}
            />
          </div>
          {view ? <StudentProgressCard view={view} /> : (
            <p className="text-sm text-muted-foreground">Select a student to view progress.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StudentPicker({
  selectedId,
  onPick,
}: {
  selectedId: string
  onPick: (id: string) => void
}) {
  const [students, setStudents] = useState<Student[]>([])
  useEffect(() => {
    void studentService.list().then(setStudents).catch(console.error)
  }, [])
  if (students.length === 0) return null
  return (
    <Select
      value={selectedId}
      onChange={(e) => onPick(e.target.value)}
      className="mt-2 max-w-sm"
    >
      <option value="">Or pick from directory…</option>
      {students
        .filter((s) => s.status === 'ACTIVE')
        .map((s) => (
          <option key={s.id} value={s.id}>
            {fullName(s)}
          </option>
        ))}
    </Select>
  )
}

function StudentProgressCard({ view }: { view: ResultPortalView }) {
  return (
    <div className="space-y-4">
      {view.accessState === 'RESULTS_LOCKED_FEES' && (
        <Alert title="RESULTS LOCKED — FEES OUTSTANDING" tone="warning">
          Clear outstanding fees to view published results.
        </Alert>
      )}
      {view.accessState === 'RESULTS_NOT_PUBLISHED' && (
        <Alert title="RESULTS NOT YET PUBLISHED" tone="info">
          Teachers have not published results for this period yet.
        </Alert>
      )}
      {view.accessState === 'RESULTS_AVAILABLE' && (
        <Alert title="RESULTS AVAILABLE" tone="success">
          Published results for {view.studentName}.
        </Alert>
      )}

      <Card>
        <CardHeader className="border-b border-border/70 bg-muted/30">
          <CardTitle>{view.studentName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {view.className} {view.streamName}
            {view.term ? ` · ${view.term}` : ''}
            {view.overallAverage != null
              ? ` · Average ${view.overallAverage.toFixed(1)}`
              : ''}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 p-5">
          {view.accessState !== 'RESULTS_AVAILABLE' ? (
            <p className="text-sm text-muted-foreground">Academic details are hidden in this state.</p>
          ) : (
            <>
              {(view.monthly?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-display text-base font-semibold">Monthly tests</h3>
                  {view.monthly!.map((block) => (
                    <div key={block.month} className="rounded-xl border border-border">
                      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                        <p className="font-medium">{block.label}</p>
                        {block.average != null ? (
                          <p className="text-sm text-muted-foreground">
                            Avg {block.average.toFixed(1)}%
                          </p>
                        ) : null}
                      </div>
                      <table className="w-full text-sm">
                        <thead className="text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 text-left">Subject</th>
                            <th className="px-4 py-2 text-left">Score</th>
                            <th className="px-4 py-2 text-left">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row) => (
                            <tr key={`${block.month}-${row.subject}`} className="border-t border-border">
                              <td className="px-4 py-2">{row.subject}</td>
                              <td className="px-4 py-2">
                                {row.score}/{row.maxScore}
                              </td>
                              <td className="px-4 py-2 font-semibold">{row.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : null}

              {view.subjects.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="font-display text-base font-semibold">Subject summary</h3>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left">Subject</th>
                          <th className="px-4 py-3 text-left">Score</th>
                          <th className="px-4 py-3 text-left">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {view.subjects.map((s) => (
                          <tr key={s.name} className="border-t border-border">
                            <td className="px-4 py-3">{s.name}</td>
                            <td className="px-4 py-3">{s.score}</td>
                            <td className="px-4 py-3 font-semibold">{s.grade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No published subject scores yet.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
