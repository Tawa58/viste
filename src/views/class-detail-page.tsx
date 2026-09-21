import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, UserPlus, Users } from 'lucide-react'
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
  SchoolClass,
  Staff,
  Student,
  Term,
} from '@/types'

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

  async function reload() {
    if (!id) return
    const [c, stu, classes, sf, y, t, sub] = await Promise.all([
      classService.getById(id),
      studentService.list(),
      classService.list(),
      catalogService.getStaff(),
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
        title={cls.name}
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Education level</p>
            <p className="mt-1 font-semibold">
              {educationLevelName(cls.educationLevelId) || cls.level}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Class teacher</p>
            <p className="mt-1 font-semibold">
              {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Year / term</p>
            <p className="mt-1 font-semibold">
              {year?.name ?? '—'}
              {cls.termSequence
                ? ` · Term ${cls.termSequence}`
                : term
                  ? ` · ${term.name}`
                  : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active students</p>
            <p className="mt-1 font-display text-2xl font-semibold">{activeStudents.length}</p>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>Update class details without renaming history records.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
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
                onChange={(e) => setEditForm((f) => ({ ...f, educationLevelId: e.target.value }))}
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
                onChange={(e) => setEditForm((f) => ({ ...f, classTeacherId: e.target.value }))}
              >
                <option value="">Select teacher</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="space-y-2">
              <Label>Subjects</Label>
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-2">
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
            <Field>
              <Label>Notes</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </Field>
          </div>
          <Button loading={saving} onClick={() => void saveEdit()}>
            Save changes
          </Button>
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
