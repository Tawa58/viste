import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, Pencil, UserPlus, Users } from 'lucide-react'
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
    termId: '',
    classTeacherId: '',
    description: '',
  })

  async function reload() {
    if (!id) return
    const [c, stu, classes, sf, y, t] = await Promise.all([
      classService.getById(id),
      studentService.list(),
      classService.list(),
      catalogService.getStaff(),
      catalogService.getYears(),
      catalogService.getTerms(),
    ])
    setCls(c)
    setStudents(stu.filter((s) => s.classId === id))
    setAllClasses(classes.filter((x) => (x.status ?? 'ACTIVE') === 'ACTIVE' && x.id !== id))
    setStaff(sf)
    setYears(y)
    setTerms(t)
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
    setEditForm({
      name: cls.name,
      educationLevelId: cls.educationLevelId ?? '',
      academicYearId: cls.academicYearId,
      termId: cls.termId ?? '',
      classTeacherId: cls.classTeacherId ?? '',
      description: cls.description ?? '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!cls) return
    setSaving(true)
    try {
      await notify.process(
        () =>
          classService.update(cls.id, {
            name: editForm.name.trim(),
            educationLevelId: editForm.educationLevelId,
            academicYearId: editForm.academicYearId,
            termId: editForm.termId || undefined,
            classTeacherId: editForm.classTeacherId || undefined,
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

  async function archive() {
    if (!cls) return
    if (!confirm(`Archive “${cls.name}”?`)) return
    await notify.process(() => classService.archive(cls.id), {
      loading: 'Archiving…',
      success: 'Class archived',
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
                {(cls.status ?? 'ACTIVE') === 'ACTIVE' ? (
                  <Button variant="ghost" className="text-destructive" onClick={() => void archive()}>
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                ) : null}
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
              {term ? ` · ${term.name}` : ''}
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
            <div className="space-y-2">
              <Label>Class name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
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
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Academic year</Label>
                <Select
                  value={editForm.academicYearId}
                  onChange={(e) => setEditForm((f) => ({ ...f, academicYearId: e.target.value }))}
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Term</Label>
                <Select
                  value={editForm.termId}
                  onChange={(e) => setEditForm((f) => ({ ...f, termId: e.target.value }))}
                >
                  <option value="">Optional</option>
                  {terms
                    .filter((t) => t.academicYearId === editForm.academicYearId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Class teacher</Label>
              <Select
                value={editForm.classTeacherId}
                onChange={(e) => setEditForm((f) => ({ ...f, classTeacherId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
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
            <div className="space-y-2">
              <Label>New class</Label>
              <Select value={toClassId} onChange={(e) => setToClassId(e.target.value)}>
                {allClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {educationLevelName(c.educationLevelId) || c.level}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason / notes</Label>
              <Textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <Button loading={saving} disabled={!toClassId} onClick={() => void confirmTransfer()}>
            Confirm transfer
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
