import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { EDUCATION_LEVELS, educationLevelName } from '@/lib/education-levels'
import { notify } from '@/lib/notify'
import { canManageClasses, canManageStudents } from '@/lib/roles'
import { catalogService, classService, studentService } from '@/services/api'
import { fullName } from '@/lib/utils'
import type {
  AcademicYear,
  DutyDay,
  DutyRosterEntry,
  SchoolClass,
  Staff,
  Student,
  Term,
} from '@/types'

const DUTY_DAYS: { day: DutyDay; label: string }[] = [
  { day: 'MON', label: 'Monday' },
  { day: 'TUE', label: 'Tuesday' },
  { day: 'WED', label: 'Wednesday' },
  { day: 'THU', label: 'Thursday' },
  { day: 'FRI', label: 'Friday' },
]

function currentWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function ClassDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = user ? canManageClasses(user.role) : false
  const canStudents = user ? canManageStudents(user.role) : false

  const [loading, setLoading] = useState(true)
  const [cls, setCls] = useState<SchoolClass | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [allClasses, setAllClasses] = useState<SchoolClass[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [subjects, setSubjects] = useState<import('@/types').Subject[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [toClassId, setToClassId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    educationLevelId: '',
    academicYearId: '',
    termSequence: 1 as 1 | 2 | 3,
    classTeacherId: '',
    subjectIds: [] as string[],
    description: '',
  })
  const [reportTermId, setReportTermId] = useState('')
  const [reportComments, setReportComments] = useState<Record<string, string>>({})
  const [weekOf, setWeekOf] = useState(currentWeekStart())
  const [dutyEntries, setDutyEntries] = useState<DutyRosterEntry[]>(
    DUTY_DAYS.map((d) => ({ day: d.day, duty: '', assigneeName: '' })),
  )
  const [dutySaving, setDutySaving] = useState(false)
  const [reportSaving, setReportSaving] = useState(false)

  async function reload() {
    if (!id) return
    const [c, stu, classes, sf, y, t, sub] = await Promise.all([
      classService.getById(id),
      studentService.list(),
      classService.list(),
      catalogService.getStaff().catch(() => [] as Staff[]),
      catalogService.getYears(),
      catalogService.getTerms(),
      catalogService.getSubjects(),
    ])
    setCls(c)
    setStudents(stu.filter((s) => s.classId === id))
    setAllClasses(classes.filter((x) => (x.status ?? 'ACTIVE') === 'ACTIVE' && x.id !== id))
    setStaff(sf)
    setYears(y)
    setTerms(t)
    setSubjects(sub)
    const termPick = t.find((x) => x.sequence === 1)?.id || t[0]?.id || ''
    setReportTermId((prev) => prev || termPick)
  }

  useEffect(() => {
    reload()
      .catch((err) => {
        console.error(err)
        notify.error('Could not load class')
      })
      .finally(() => setLoading(false))
  }, [id])

  const teacher = useMemo(
    () => staff.find((s) => s.id === cls?.classTeacherId),
    [staff, cls],
  )
  const year = years.find((y) => y.id === cls?.academicYearId)
  const term = terms.find((t) => t.id === cls?.termId)
  const activeStudents = students.filter((s) => s.status === 'ACTIVE')
  const isMyClass = Boolean(user?.staffId && cls?.classTeacherId === user.staffId)
  const canClassTeacherTools = isMyClass || canManage

  useEffect(() => {
    if (!id || !reportTermId || !canClassTeacherTools) return
    void classService
      .getTeacherReports?.(id, reportTermId)
      .then((rows) => {
        const next: Record<string, string> = {}
        for (const s of students.filter((x) => x.status === 'ACTIVE')) {
          next[s.id] = rows.find((r) => r.studentId === s.id)?.comment ?? ''
        }
        setReportComments(next)
      })
      .catch(() => {
        const next: Record<string, string> = {}
        for (const s of students.filter((x) => x.status === 'ACTIVE')) next[s.id] = ''
        setReportComments(next)
      })
  }, [id, reportTermId, canClassTeacherTools, students])

  useEffect(() => {
    if (!id || !weekOf || !canClassTeacherTools) return
    void classService
      .getDutyRoster?.(id, weekOf)
      .then((roster) => {
        if (!roster?.entries?.length) {
          setDutyEntries(DUTY_DAYS.map((d) => ({ day: d.day, duty: '', assigneeName: '' })))
          return
        }
        setDutyEntries(
          DUTY_DAYS.map((d) => {
            const found = roster.entries.find((e) => e.day === d.day)
            return (
              found ?? {
                day: d.day,
                duty: '',
                assigneeName: '',
              }
            )
          }),
        )
      })
      .catch(() => {
        setDutyEntries(DUTY_DAYS.map((d) => ({ day: d.day, duty: '', assigneeName: '' })))
      })
  }, [id, weekOf, canClassTeacherTools])

  async function saveReports() {
    if (!id || !reportTermId || !classService.saveTeacherReports) return
    const entries = activeStudents
      .map((s) => ({
        studentId: s.id,
        comment: (reportComments[s.id] ?? '').trim(),
      }))
      .filter((e) => e.comment.length > 0)
    if (entries.length === 0) {
      notify.error('Enter at least one class teacher comment')
      return
    }
    setReportSaving(true)
    try {
      await notify.process(
        () => classService.saveTeacherReports!(id, { termId: reportTermId, entries }),
        { loading: 'Saving report comments…', success: 'Final report comments saved' },
      )
    } finally {
      setReportSaving(false)
    }
  }

  async function saveDuties() {
    if (!id || !classService.saveDutyRoster) return
    setDutySaving(true)
    try {
      await notify.process(
        () =>
          classService.saveDutyRoster!(id, {
            weekOf,
            entries: dutyEntries.filter((e) => e.duty.trim()),
          }),
        { loading: 'Saving duty roster…', success: 'Duty roster saved' },
      )
    } finally {
      setDutySaving(false)
    }
  }

  function openEdit() {
    if (!cls) return
    const seq =
      (cls.termSequence as 1 | 2 | 3 | undefined) ||
      (terms.find((t) => t.id === cls.termId)?.sequence as 1 | 2 | 3 | undefined) ||
      1
    setEditForm({
      name: cls.name,
      educationLevelId: cls.educationLevelId ?? '',
      academicYearId: cls.academicYearId,
      termSequence: seq,
      classTeacherId: cls.classTeacherId ?? '',
      subjectIds: [...(cls.subjectIds ?? [])],
      description: cls.description ?? '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!cls) return
    if (!editForm.classTeacherId) {
      notify.error('Class teacher is required')
      return
    }
    setSaving(true)
    try {
      await notify.process(
        () =>
          classService.update(cls.id, {
            name: editForm.name.trim(),
            educationLevelId: editForm.educationLevelId,
            academicYearId: editForm.academicYearId || undefined,
            termSequence: editForm.termSequence,
            classTeacherId: editForm.classTeacherId,
            subjectIds: editForm.subjectIds,
            description: editForm.description.trim() || undefined,
          }),
        { loading: 'Saving class…', success: 'Class updated' },
      )
      setEditOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function removeClass() {
    if (!cls) return
    if (activeStudents.length > 0) {
      notify.error(
        'Cannot delete this class',
        `${activeStudents.length} student(s) are still assigned. Transfer them first.`,
      )
      return
    }
    if (!confirm(`Permanently delete “${cls.name}”? This cannot be undone.`)) return
    await notify.process(() => classService.remove(cls.id), {
      loading: 'Deleting class…',
      success: 'Class deleted',
      error: 'Could not delete class',
    })
    navigate('/classes')
  }

  function openTransfer(student: Student) {
    setSelectedStudent(student)
    setToClassId(allClasses[0]?.id ?? '')
    setTransferReason('')
    setTransferOpen(true)
  }

  async function confirmTransfer() {
    if (!selectedStudent || !toClassId || !studentService.transfer) return
    setSaving(true)
    try {
      await notify.process(
        () =>
          studentService.transfer!({
            studentId: selectedStudent.id,
            toClassId,
            reason: transferReason.trim() || undefined,
          }),
        { loading: 'Transferring student…', success: 'Student transferred' },
      )
      setTransferOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function removeFromClass(student: Student) {
    if (!confirm(`Mark ${fullName(student)} as withdrawn from this class roster?`)) return
    await notify.process(
      () => studentService.update(student.id, { status: 'WITHDRAWN' }),
      { loading: 'Updating student…', success: 'Student removed from active roster' },
    )
    await reload()
  }

  if (loading) return <LoadingState message="Loading class…" />
  if (!cls) {
    return (
      <EmptyState
        icon={Users}
        title="Class not found"
        description="This class may have been removed."
        actionLabel="Back to classes"
        onAction={() => navigate('/classes')}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={isMyClass ? `My class · ${cls.name}` : cls.name}
        description={`${educationLevelName(cls.educationLevelId) || cls.level} · ${year?.name ?? '—'}${term ? ` · ${term.name}` : ''}`}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Classes', to: '/classes' },
          { label: cls.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/classes">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            {isMyClass ? (
              <Button asChild>
                <Link to={`/attendance?classId=${cls.id}`}>
                  <ClipboardList className="h-4 w-4" />
                  Mark register
                </Link>
              </Button>
            ) : null}
            {canStudents ? (
              <Button asChild>
                <Link to={`/students?classId=${cls.id}&register=1`}>
                  <UserPlus className="h-4 w-4" />
                  Add student
                </Link>
              </Button>
            ) : null}
            {canManage ? (
              <>
                <Button variant="outline" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => void removeClass()}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <Card className="shadow-none">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] text-muted-foreground sm:text-xs">Education level</p>
            <p className="mt-0.5 text-sm font-semibold leading-tight sm:mt-1 sm:text-base">
              {educationLevelName(cls.educationLevelId) || cls.level}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] text-muted-foreground sm:text-xs">Class teacher</p>
            <p className="mt-0.5 text-sm font-semibold leading-tight sm:mt-1 sm:text-base">
              {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] text-muted-foreground sm:text-xs">Year / term</p>
            <p className="mt-0.5 text-sm font-semibold leading-tight sm:mt-1 sm:text-base">
              {year?.name ?? '—'}
              {cls.termSequence
                ? ` · Term ${cls.termSequence}`
                : term
                  ? ` · ${term.name}`
                  : ''}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="px-3 py-2 sm:px-4 sm:py-3">
            <p className="text-[10px] text-muted-foreground sm:text-xs">Active students</p>
            <p className="mt-0.5 font-display text-lg font-semibold leading-tight sm:mt-1 sm:text-2xl">
              {activeStudents.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {(cls.subjectIds ?? []).length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {subjects
              .filter((s) => (cls.subjectIds ?? []).includes(s.id))
              .map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.name}
                </Badge>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {cls.description ? (
        <Card className="mb-6">
          <CardContent className="p-4 text-sm text-muted-foreground">{cls.description}</CardContent>
        </Card>
      ) : null}

      {canClassTeacherTools ? (
        <div className="mb-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class teacher duties</CardTitle>
              <p className="text-sm text-muted-foreground">
                Mark the daily register, maintain the student list, write final report comments, and
                keep the weekly duty roster.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={`/attendance?classId=${cls.id}`}>
                  <ClipboardList className="h-4 w-4" />
                  Mark register
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/examinations?classId=${cls.id}`}>Enter subject marks</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Final report comments</CardTitle>
              <p className="text-sm text-muted-foreground">
                Homeroom comments for each student — shown on the results portal after marks are
                released.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-w-xs space-y-1.5">
                <Label>Term</Label>
                <Select value={reportTermId} onChange={(e) => setReportTermId(e.target.value)}>
                  <option value="">Select term</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              {activeStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active students.</p>
              ) : (
                <div className="space-y-3">
                  {activeStudents.map((s) => (
                    <div key={s.id} className="space-y-1.5">
                      <Label>{fullName(s)}</Label>
                      <Textarea
                        rows={2}
                        value={reportComments[s.id] ?? ''}
                        onChange={(e) =>
                          setReportComments((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        placeholder="Class teacher final remark…"
                      />
                    </div>
                  ))}
                </div>
              )}
              <Button loading={reportSaving} onClick={() => void saveReports()}>
                Save report comments
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duty roster</CardTitle>
              <p className="text-sm text-muted-foreground">
                Weekly classroom duties for this class (monitors, cleaners, etc.).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-w-xs space-y-1.5">
                <Label>Week starting</Label>
                <Input type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
              </div>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Day</th>
                      <th className="px-3 py-2">Duty</th>
                      <th className="px-3 py-2">Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DUTY_DAYS.map((d, i) => {
                      const row = dutyEntries[i] ?? {
                        day: d.day,
                        duty: '',
                        assigneeName: '',
                      }
                      return (
                        <tr key={d.day} className="border-t border-border">
                          <td className="px-3 py-2 font-medium">{d.label}</td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.duty}
                              placeholder="e.g. Class monitor"
                              onChange={(e) =>
                                setDutyEntries((prev) =>
                                  prev.map((x, idx) =>
                                    idx === i ? { ...x, duty: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.assigneeName ?? ''}
                              placeholder="Student name"
                              onChange={(e) =>
                                setDutyEntries((prev) =>
                                  prev.map((x, idx) =>
                                    idx === i ? { ...x, assigneeName: e.target.value } : x,
                                  ),
                                )
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Button loading={dutySaving} onClick={() => void saveDuties()}>
                Save duty roster
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>Students</span>
            <Badge variant="secondary">{students.length} total</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No students in this class yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Admission #</th>
                    <th className="px-3 py-2 font-medium">Gender</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-border/70">
                      <td className="px-3 py-3">
                        <Link
                          to={`/students/${s.id}`}
                          className="flex items-center gap-2 font-medium hover:text-primary"
                        >
                          <Avatar name={fullName(s)} className="h-8 w-8" />
                          {fullName(s)}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{s.admissionNumber}</td>
                      <td className="px-3 py-3">{s.gender}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <Link to={`/students/${s.id}`}>Profile</Link>
                          </Button>
                          {canManage && s.status === 'ACTIVE' ? (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => openTransfer(s)}>
                                Transfer
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => void removeFromClass(s)}
                              >
                                Remove
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)]">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>Update class details without renaming history records.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <div className="grid gap-3 content-start">
                <Field>
                  <Label>Class name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field>
                  <Label>Education level</Label>
                  <Select
                    value={editForm.educationLevelId}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, educationLevelId: e.target.value }))
                    }
                  >
                    {EDUCATION_LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <Label>Academic year</Label>
                    <Input
                      value={
                        (years.find((y) => y.id === editForm.academicYearId)?.name ??
                          years.find((y) => y.isCurrent)?.name ??
                          'Current year') + ' (automatic)'
                      }
                      disabled
                    />
                  </Field>
                  <Field>
                    <Label>Term</Label>
                    <Select
                      value={String(editForm.termSequence)}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          termSequence: Number(e.target.value) as 1 | 2 | 3,
                        }))
                      }
                    >
                      <option value="1">Term 1</option>
                      <option value="2">Term 2</option>
                      <option value="3">Term 3</option>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <Label>Class teacher</Label>
                  <Select
                    value={editForm.classTeacherId}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, classTeacherId: e.target.value }))
                    }
                  >
                    <option value="">Select teacher</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  <Label>Notes</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, description: e.target.value }))
                    }
                    rows={3}
                  />
                </Field>
              </div>

              <div className="flex min-h-0 flex-col gap-2">
                <Label>Subjects</Label>
                <div className="grid max-h-[min(50vh,360px)] flex-1 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2 lg:max-h-none lg:min-h-[280px]">
                  {subjects
                    .filter((s) => {
                      if (s.active === false) return false
                      if (!s.educationLevelIds?.length) return true
                      return s.educationLevelIds.includes(editForm.educationLevelId)
                    })
                    .map((subject) => {
                      const checked = editForm.subjectIds.includes(subject.id)
                      return (
                        <label key={subject.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditForm((f) => ({
                                ...f,
                                subjectIds: checked
                                  ? f.subjectIds.filter((x) => x !== subject.id)
                                  : [...f.subjectIds, subject.id],
                              }))
                            }
                          />
                          {subject.name}
                        </label>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void saveEdit()}>
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer student</DialogTitle>
            <DialogDescription>
              Move {selectedStudent ? fullName(selectedStudent) : 'student'} to another class. Prior
              class history is preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Field>
              <Label>New class</Label>
              <Select value={toClassId} onChange={(e) => setToClassId(e.target.value)}>
                {allClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {educationLevelName(c.educationLevelId) || c.level}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Reason / notes</Label>
              <Textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                rows={3}
              />
            </Field>
          </div>
          <Button loading={saving} disabled={!toClassId} onClick={() => void confirmTransfer()}>
            Confirm transfer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
