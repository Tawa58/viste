import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/shared/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { catalogService, studentService } from '@/services/api'
import { runMockProcess } from '@/lib/notify'
import { fullName } from '@/lib/utils'
import type {
  Assessment,
  Examination,
  Mark,
  ResultPortalView,
  Student,
} from '@/types'

const workflow = ['Marks Entry', 'Submitted', 'Under Review', 'Approved', 'Published'] as const

export function ExaminationsPage() {
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [exams, setExams] = useState<Examination[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState('as-3')

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
    <div>
      <PageHeader
        title="Examinations"
        description="Assessments, marks entry, and approval workflow."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Examinations' }]}
      />

      <Card className="mb-4">
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
            {exams.map((e) => (
              <div key={e.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{e.name}</p>
                <p className="text-muted-foreground">
                  {e.startDate} → {e.endDate}
                </p>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Marks entry</CardTitle>
            <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-56">
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </CardHeader>
          <CardContent>
            {assessment && (
              <p className="mb-3 text-sm text-muted-foreground">
                {assessment.type} · max {assessment.maxScore} ·{' '}
                <StatusBadge status={assessment.status} />
              </p>
            )}
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
                  {students
                    .filter((s) => s.streamId === assessment?.streamId)
                    .map((s) => {
                      const mark = marks.find(
                        (m) => m.assessmentId === selected && m.studentId === s.id,
                      )
                      return (
                        <tr key={s.id} className="border-t border-border">
                          <td className="px-4 py-3">{fullName(s)}</td>
                          <td className="px-4 py-3">
                            <input
                              className="h-9 w-20 rounded-md border border-input bg-card px-2"
                              defaultValue={mark?.score ?? ''}
                              type="number"
                            />
                          </td>
                          <td className="px-4 py-3">{mark?.grade ?? '—'}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={mark?.status ?? 'DRAFT'} />
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                loading={busyAction === 'draft'}
                onClick={() =>
                  void runExamAction('draft', {
                    loading: 'Saving draft marks…',
                    success: 'Draft marks saved',
                  })
                }
              >
                Save draft
              </Button>
              <Button
                loading={busyAction === 'submit'}
                onClick={() =>
                  void runExamAction('submit', {
                    loading: 'Submitting for review…',
                    success: 'Marks submitted for review',
                  })
                }
              >
                Submit for review
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function ResultsPage() {
  const [loading, setLoading] = useState(true)
  const [portals, setPortals] = useState<ResultPortalView[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [busyAction, setBusyAction] = useState<string | null>(null)

  useEffect(() => {
    catalogService.getResultPortals().then((rows) => {
      setPortals(rows)
      setSelectedId(rows[0]?.studentId ?? '')
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState message="Loading results portal…" />
  const view = portals.find((p) => p.studentId === selectedId) ?? portals[0]

  return (
    <div>
      <PageHeader
        title="Results"
        description="Result summaries and student/parent portal states (UI mock)."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Results' }]}
      />

      <Tabs defaultValue="admin">
        <TabsList>
          <TabsTrigger value="admin">Admin / Teacher</TabsTrigger>
          <TabsTrigger value="portal">Student / Parent portal</TabsTrigger>
        </TabsList>

        <TabsContent value="admin">
          <Card>
            <CardContent className="space-y-3 p-5">
              {portals.map((p) => (
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
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal">
          <div className="mb-4">
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="max-w-sm">
              {portals.map((p) => (
                <option key={p.studentId} value={p.studentId}>
                  {p.studentName} · {p.accessState}
                </option>
              ))}
            </Select>
          </div>

          {view.accessState === 'RESULTS_LOCKED_FEES' && (
            <Alert title="RESULTS LOCKED — FEES OUTSTANDING" tone="warning" className="mb-4">
              Mock UI only. Spring Boot will enforce this authorization later.
            </Alert>
          )}
          {view.accessState === 'RESULTS_NOT_PUBLISHED' && (
            <Alert title="RESULTS NOT YET PUBLISHED" tone="info" className="mb-4">
              Results are still in the approval workflow.
            </Alert>
          )}
          {view.accessState === 'RESULTS_AVAILABLE' && (
            <Alert title="RESULTS AVAILABLE" tone="success" className="mb-4">
              Published results are visible for this account.
            </Alert>
          )}

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/70 bg-muted/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>
                    {view.studentName}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {view.className} {view.streamName} · {view.academicYear} · {view.term}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={busyAction === 'print'}
                    onClick={() => {
                      void (async () => {
                        setBusyAction('print')
                        try {
                          await runMockProcess({
                            loading: 'Preparing print view…',
                            success: 'Print dialog ready',
                          })
                        } finally {
                          setBusyAction(null)
                        }
                      })()
                    }}
                  >
                    Print
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busyAction === 'download'}
                    onClick={() => {
                      void (async () => {
                        setBusyAction('download')
                        try {
                          await runMockProcess({
                            loading: 'Preparing download…',
                            success: 'Results download ready',
                          })
                        } finally {
                          setBusyAction(null)
                        }
                      })()
                    }}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {view.accessState !== 'RESULTS_AVAILABLE' ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
                  <p className="font-display text-lg font-semibold">Results unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Academic details are hidden in this access state. Fee amounts are not shown.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Overall average
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">
                        {view.overallAverage ?? '—'}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Subjects
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">
                        {view.subjects.length}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Class position
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">3 / 32</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {view.subjects.map((s) => (
                      <div
                        key={s.name}
                        className="flex items-center justify-between rounded-xl border border-border/70 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <div>
                          <p className="font-semibold">{s.name}</p>
                          {s.comment && (
                            <p className="text-xs text-muted-foreground">{s.comment}</p>
                          )}
                        </div>
                        <p className="font-semibold tabular-nums">
                          {s.score} · {s.grade}
                        </p>
                      </div>
                    ))}
                  </div>
                  {view.teacherComment && (
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Teacher comment
                      </p>
                      <p className="mt-1 leading-relaxed">{view.teacherComment}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
