import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Alert } from '@/components/shared/alert'
import {
  GuardianEditorForm,
  StudentEditorForm,
  guardianToFormValues,
  studentToFormValues,
  type GuardianFormValues,
  type StudentFormValues,
} from '@/components/shared/student-editor-form'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import { notify } from '@/lib/notify'
import { canEditStudentLimited, canManageStudents } from '@/lib/roles'
import { educationLevelName } from '@/lib/education-levels'
import { catalogService, studentService } from '@/services/api'
import { formatCurrency, formatDate, fullName } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  AttendanceRecord,
  Guardian,
  Invoice,
  Mark,
  SchoolClass,
  Stream,
  Student,
  Subject,
} from '@/types'

export function StudentDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const fullAccess = user ? canManageStudents(user.role) : false
  const canEdit = user ? canEditStudentLimited(user.role) : false

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<Student | undefined>()
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sports, setSports] = useState<import('@/types').Sport[]>([])
  const [clubs, setClubs] = useState<import('@/types').ClubActivity[]>([])
  const [houses, setHouses] = useState<import('@/types').House[]>([])
  const [exemptions, setExemptions] = useState<import('@/types').StudentExemption[]>([])
  const [transfers, setTransfers] = useState<import('@/types').ClassTransfer[]>([])
  const [allGuardians, setAllGuardians] = useState<Guardian[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [marks, setMarks] = useState<Mark[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [guardianOpen, setGuardianOpen] = useState(false)
  const [exemptionOpen, setExemptionOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null)
  const [form, setForm] = useState<StudentFormValues>(studentToFormValues())
  const [guardianForm, setGuardianForm] = useState<GuardianFormValues>(guardianToFormValues())
  const [saving, setSaving] = useState(false)
  const [exemptionForm, setExemptionForm] = useState({
    type: 'SUBJECT' as import('@/types').ExemptionType,
    targetLabel: '',
    reason: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    notes: '',
  })
  const [toClassId, setToClassId] = useState('')
  const [transferReason, setTransferReason] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([
      studentService.getById(id),
      catalogService.getClasses(),
      catalogService.getStreams(),
      catalogService.getSubjects(),
      catalogService.getSports?.() ?? Promise.resolve([]),
      catalogService.getClubs?.() ?? Promise.resolve([]),
      catalogService.getHouses?.() ?? Promise.resolve([]),
      catalogService.getGuardians(),
      catalogService.getAttendance(),
      catalogService.getInvoices(),
      catalogService.getMarks(),
      studentService.listExemptions?.(id) ?? Promise.resolve([]),
      studentService.listTransfers?.(id) ?? Promise.resolve([]),
    ]).then(([s, c, st, sub, sp, cl, ho, g, a, inv, m, ex, xf]) => {
      setStudent(s)
      setClasses(c)
      setStreams(st)
      setSubjects(sub)
      setSports(sp)
      setClubs(cl)
      setHouses(ho)
      setAllGuardians(g)
      setGuardians(g.filter((x) => s?.guardianIds.includes(x.id)))
      setAttendance(a.filter((x) => x.studentId === id))
      setInvoices(inv.filter((x) => x.studentId === id))
      setMarks(m.filter((x) => x.studentId === id))
      setExemptions(ex)
      setTransfers(xf)
      setLoading(false)
    })
  }, [id])

  function openStudentEdit() {
    if (!student) return
    setForm(studentToFormValues(student))
    setEditOpen(true)
  }

  function openGuardianEdit(guardian: Guardian) {
    setEditingGuardian(guardian)
    setGuardianForm(guardianToFormValues(guardian))
    setGuardianOpen(true)
  }

  async function saveStudent() {
    if (!student) return
    if (fullAccess && (!form.firstName.trim() || !form.lastName.trim())) {
      notify.error('First and last name are required')
      return
    }
    setSaving(true)
    try {
      const patch = fullAccess
        ? {
            firstName: form.firstName.trim(),
            middleName: form.middleName.trim() || undefined,
            lastName: form.lastName.trim(),
            dateOfBirth: form.dateOfBirth,
            gender: form.gender,
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            address: form.address.trim() || '—',
            admissionDate: form.admissionDate,
            status: form.status,
            streamId: form.streamId,
            educationLevelId: form.educationLevelId || undefined,
            academicYearId: form.academicYearId || undefined,
            termId: form.termId || undefined,
            subjectIds: form.subjectIds,
            sportIds: form.sportIds,
            clubIds: form.clubIds,
            houseId: form.houseId || undefined,
            guardianIds: form.guardianIds,
            studentNumber: form.studentNumber.trim() || student.studentNumber,
            admissionNumber: form.admissionNumber.trim() || student.admissionNumber,
          }
        : {
            phone: form.phone.trim() || undefined,
            address: form.address.trim() || student.address,
          }

      const updated = await notify.process(() => studentService.update(student.id, patch), {
        loading: 'Saving student…',
        success: fullAccess ? 'Student profile updated' : 'Contact details updated',
      })
      setStudent(updated)
      setGuardians(allGuardians.filter((x) => updated.guardianIds.includes(x.id)))
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function saveGuardian() {
    if (!editingGuardian || !student) return
    if (!guardianForm.firstName.trim() || !guardianForm.lastName.trim()) {
      notify.error('Guardian name is required')
      return
    }
    setSaving(true)
    try {
      const updated = await notify.process(
        () =>
          catalogService.updateGuardian(editingGuardian.id, {
            firstName: guardianForm.firstName.trim(),
            lastName: guardianForm.lastName.trim(),
            relationship: guardianForm.relationship.trim() || 'Parent',
            email: guardianForm.email.trim(),
            phone: guardianForm.phone.trim(),
            address: guardianForm.address.trim() || '—',
            occupation: guardianForm.occupation.trim() || undefined,
            emergencyContact: guardianForm.emergencyContact,
          }),
        {
          loading: 'Saving guardian…',
          success: 'Guardian details updated',
        },
      )
      setAllGuardians((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      setGuardians((prev) => prev.map((g) => (g.id === updated.id ? updated : g)))
      setGuardianOpen(false)
      setEditingGuardian(null)
    } finally {
      setSaving(false)
    }
  }

  async function saveExemption() {
    if (!student || !studentService.createExemption) return
    if (!exemptionForm.targetLabel.trim() || !exemptionForm.reason.trim()) {
      notify.error('Target and reason are required')
      return
    }
    setSaving(true)
    try {
      const created = await notify.process(
        () =>
          studentService.createExemption!(student.id, {
            type: exemptionForm.type,
            targetLabel: exemptionForm.targetLabel.trim(),
            reason: exemptionForm.reason.trim(),
            startDate: exemptionForm.startDate,
            endDate: exemptionForm.endDate || undefined,
            notes: exemptionForm.notes.trim() || undefined,
          }),
        { loading: 'Creating exemption…', success: 'Exemption recorded' },
      )
      setExemptions((prev) => [created, ...prev])
      setExemptionOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function confirmTransfer() {
    if (!student || !toClassId || !studentService.transfer) return
    setSaving(true)
    try {
      const result = await notify.process(
        () =>
          studentService.transfer!({
            studentId: student.id,
            toClassId,
            reason: transferReason.trim() || undefined,
          }),
        { loading: 'Transferring…', success: 'Student transferred' },
      )
      setStudent(result.student)
      setTransfers((prev) => [result.transfer, ...prev])
      setTransferOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading student profile…" />
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
  const present = attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length
  const attendancePct = attendance.length
    ? Math.round((present / attendance.length) * 100)
    : 0
  const outstanding = invoices.reduce((sum, i) => sum + (i.total - i.paid), 0)
  const enrolledSubjects = subjects.filter((s) => student.subjectIds.includes(s.id))

  return (
    <div>
      <PageHeader
        title={fullName(student)}
        description={`${student.admissionNumber} · ${cls}`}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Students', to: '/students' },
          { label: fullName(student) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <Button onClick={openStudentEdit}>
                <Pencil className="h-4 w-4" />
                {fullAccess ? 'Edit profile' : 'Update contact'}
              </Button>
            ) : null}
            {fullAccess ? (
              <>
                <Button variant="outline" onClick={() => setExemptionOpen(true)}>
                  Add exemption
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setToClassId(classes.find((c) => c.id !== student.classId)?.id ?? '')
                    setTransferReason('')
                    setTransferOpen(true)
                  }}
                >
                  Transfer
                </Button>
              </>
            ) : null}
            <Button variant="outline" asChild>
              <Link to="/students">Back</Link>
            </Button>
          </div>
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
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{student.email ?? 'No email'}</p>
                <p>{student.phone ?? 'No phone'}</p>
                <p className="text-muted-foreground">{student.address}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Placement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  {cls}
                  {educationLevelName(student.educationLevelId) !== '—'
                    ? ` · ${educationLevelName(student.educationLevelId)}`
                    : ''}
                </p>
                <p>Admission {student.admissionNumber}</p>
                <p>DOB {formatDate(student.dateOfBirth)}</p>
                {student.houseId ? (
                  <p>House {houses.find((h) => h.id === student.houseId)?.name ?? student.houseId}</p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quick stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Attendance {attendancePct}%</p>
                <p>Outstanding {formatCurrency(outstanding)}</p>
                <p>{enrolledSubjects.length} enrolled subjects</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Registered subjects</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 p-5">
                {enrolledSubjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subjects registered.</p>
                ) : (
                  enrolledSubjects.map((s) => (
                    <Badge key={s.id} variant="secondary">
                      {s.name}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Sports & activities</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 p-5">
                {(student.sportIds ?? []).length === 0 && (student.clubIds ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">None assigned.</p>
                ) : (
                  <>
                    {sports
                      .filter((s) => (student.sportIds ?? []).includes(s.id))
                      .map((s) => (
                        <Badge key={s.id} variant="outline">
                          {s.name}
                        </Badge>
                      ))}
                    {clubs
                      .filter((c) => (student.clubIds ?? []).includes(c.id))
                      .map((c) => (
                        <Badge key={c.id} variant="secondary">
                          {c.name}
                        </Badge>
                      ))}
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Active exemptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-5">
                {exemptions.filter((e) => e.active).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active exemptions.</p>
                ) : (
                  exemptions
                    .filter((e) => e.active)
                    .map((e) => (
                      <div
                        key={e.id}
                        className="rounded-xl border border-border px-3 py-2 text-sm"
                      >
                        <p className="font-medium">
                          {e.type}: {e.targetLabel}
                        </p>
                        <p className="text-muted-foreground">{e.reason}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(e.startDate)}
                          {e.endDate ? ` – ${formatDate(e.endDate)}` : ''}
                          {e.createdByName ? ` · by ${e.createdByName}` : ''}
                        </p>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>
            {transfers.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Transfer history</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-5">
                  {transfers.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                      <p className="font-medium">
                        {classes.find((c) => c.id === t.fromClassId)?.name ?? t.fromClassId} →{' '}
                        {classes.find((c) => c.id === t.toClassId)?.name ?? t.toClassId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                        {t.reason ? ` · ${t.reason}` : ''}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
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
              {invoices.length === 0 && (
                <p className="text-sm text-muted-foreground">No invoices.</p>
              )}
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{inv.number}</p>
                    <p className="text-muted-foreground">Due {formatDate(inv.dueDate)}</p>
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
            {guardians.length === 0 ? (
              <Card>
                <CardContent className="p-5 text-sm text-muted-foreground">
                  No guardians linked to this student.
                </CardContent>
              </Card>
            ) : null}
            {guardians.map((g) => (
              <Card key={g.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <CardTitle>
                    {g.firstName} {g.lastName}
                  </CardTitle>
                  {fullAccess ? (
                    <Button variant="outline" size="sm" onClick={() => openGuardianEdit(g)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{g.relationship}</p>
                  <p>{g.email}</p>
                  <p>{g.phone}</p>
                  <p className="text-muted-foreground">{g.address}</p>
                  {g.occupation ? (
                    <p className="text-muted-foreground">Occupation: {g.occupation}</p>
                  ) : null}
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link to={`/parents/${g.id}`}>Open guardian</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {!fullAccess ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Guardian records can only be edited by school admin or registrar.
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="p-5">
              <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
                <p className="font-medium">No documents uploaded</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  File storage will connect to Spring Boot later.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{fullAccess ? 'Edit student profile' : 'Update contact info'}</DialogTitle>
            <DialogDescription>
              {fullAccess
                ? 'Admin can update profile, enrolment, subjects, and guardians.'
                : 'Teachers may update phone and address only.'}
            </DialogDescription>
          </DialogHeader>
          <StudentEditorForm
            mode="edit"
            values={form}
            onChange={setForm}
            classes={classes}
            streams={streams}
            subjects={subjects}
            sports={sports}
            clubs={clubs}
            houses={houses}
            guardians={allGuardians}
            fullAccess={fullAccess}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void saveStudent()}>
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exemptionOpen} onOpenChange={setExemptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create exemption</DialogTitle>
            <DialogDescription>
              Record a subject, sport, activity, or other approved exemption.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={exemptionForm.type}
                onChange={(e) =>
                  setExemptionForm((f) => ({
                    ...f,
                    type: e.target.value as import('@/types').ExemptionType,
                  }))
                }
              >
                <option value="SUBJECT">Subject exemption</option>
                <option value="SPORT">Sports exemption</option>
                <option value="ACTIVITY">Activity exemption</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject / activity / requirement</Label>
              <Input
                value={exemptionForm.targetLabel}
                onChange={(e) =>
                  setExemptionForm((f) => ({ ...f, targetLabel: e.target.value }))
                }
                placeholder="e.g. Physical Education"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={exemptionForm.reason}
                onChange={(e) => setExemptionForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={exemptionForm.startDate}
                  onChange={(e) =>
                    setExemptionForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={exemptionForm.endDate}
                  onChange={(e) => setExemptionForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={exemptionForm.notes}
                onChange={(e) => setExemptionForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <Button loading={saving} onClick={() => void saveExemption()}>
            Save exemption
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer student</DialogTitle>
            <DialogDescription>
              Move to another class while keeping historical records.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>New class</Label>
              <Select value={toClassId} onChange={(e) => setToClassId(e.target.value)}>
                {classes
                  .filter((c) => c.id !== student?.classId && (c.status ?? 'ACTIVE') === 'ACTIVE')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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

      <Dialog open={guardianOpen} onOpenChange={setGuardianOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit guardian</DialogTitle>
            <DialogDescription>Update guardian contact and relationship details.</DialogDescription>
          </DialogHeader>
          <GuardianEditorForm values={guardianForm} onChange={setGuardianForm} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGuardianOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void saveGuardian()}>
              Save guardian
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
