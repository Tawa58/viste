import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { ProfilePhotoUpload } from '@/components/shared/profile-photo-upload'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { catalogService } from '@/services/api'
import type { Staff, Subject } from '@/types'

const emptyForm = {
  firstName: '',
  lastName: '',
  department: '',
  title: '',
  email: '',
  phone: '',
  photoUrl: undefined as string | undefined,
}

export function TeachersPage() {
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<Staff[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    Promise.all([catalogService.getStaff(), catalogService.getSubjects()]).then(([s, sub]) => {
      setStaff(s)
      setSubjects(sub)
      setLoading(false)
    })
  }, [])

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return staff.filter(
      (s) =>
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.employeeNumber.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q),
    )
  }, [staff, search])

  async function handleCreate() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required')
      return
    }
    setSaving(true)
    try {
      const created = await catalogService.createStaff({
        employeeNumber: `EMP-${1000 + staff.length + 1}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@viste.school`,
        phone: form.phone.trim() || '—',
        department: form.department.trim() || 'General',
        title: form.title.trim() || 'Staff',
        status: 'ACTIVE',
        subjectIds: [],
        classIds: [],
        hireDate: new Date().toISOString().slice(0, 10),
        photoUrl: form.photoUrl,
      })
      setStaff((prev) => [created, ...prev])
      setForm(emptyForm)
      setOpen(false)
      toast.success('Staff member added')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Teachers & Staff"
        description="Staff directory, departments, and profile photos."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Teachers & Staff' }]}
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm)
              setOpen(true)
            }}
          >
            <Plus /> Add staff
          </Button>
        }
      />
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search staff…" />
          <div className="grid gap-3">
            {rows.map((s) => {
              const fullName = `${s.firstName} ${s.lastName}`
              return (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={fullName} src={s.photoUrl} className="h-12 w-12 text-sm" />
                    <div className="min-w-0">
                      <Link
                        to={`/teachers/${s.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {fullName}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {s.title} · {s.department} · {s.employeeNumber}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Subjects:{' '}
                        {s.subjectIds
                          .map((id) => subjects.find((x) => x.id === id)?.name)
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setForm(emptyForm)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
            <DialogDescription>
              Create a teacher or other staff profile, including an optional photo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ProfilePhotoUpload
              name={`${form.firstName || 'New'} ${form.lastName || 'Staff'}`.trim()}
              value={form.photoUrl}
              onChange={(photoUrl) => setForm((f) => ({ ...f, photoUrl }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff-first">First name</Label>
                <Input
                  id="staff-first"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-last">Last name</Label>
                <Input
                  id="staff-last"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-title">Title / role</Label>
                <Input
                  id="staff-title"
                  placeholder="e.g. Senior Teacher"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-dept">Department</Label>
                <Input
                  id="staff-dept"
                  placeholder="e.g. Mathematics"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void handleCreate()}>
              {saving ? 'Saving…' : 'Save staff'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function TeacherDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<Staff | undefined>()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [savingPhoto, setSavingPhoto] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([catalogService.getStaffMember(id), catalogService.getSubjects()]).then(
      ([s, sub]) => {
        setMember(s)
        setSubjects(sub)
        setLoading(false)
      },
    )
  }, [id])

  async function handlePhotoChange(photoUrl: string | undefined) {
    if (!member) return
    setSavingPhoto(true)
    try {
      const updated = await catalogService.updateStaffPhoto(member.id, photoUrl)
      if (updated) setMember(updated)
    } finally {
      setSavingPhoto(false)
    }
  }

  if (loading) return <LoadingState />
  if (!member) return <p>Staff member not found.</p>

  const fullName = `${member.firstName} ${member.lastName}`

  return (
    <div>
      <PageHeader
        title={fullName}
        description={`${member.title} · ${member.department}`}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Teachers', to: '/teachers' },
          { label: member.lastName },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 p-5">
            <ProfilePhotoUpload
              name={fullName}
              value={member.photoUrl}
              onChange={(photoUrl) => void handlePhotoChange(photoUrl)}
              disabled={savingPhoto}
            />
            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <p>Employee #: {member.employeeNumber}</p>
              <p>Email: {member.email}</p>
              <p>Phone: {member.phone}</p>
              <p>Hired: {member.hireDate}</p>
              <StatusBadge status={member.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-5 text-sm">
            <p className="font-medium">Subjects assigned</p>
            {member.subjectIds.length ? (
              member.subjectIds.map((sid) => (
                <p key={sid}>{subjects.find((s) => s.id === sid)?.name}</p>
              ))
            ) : (
              <p className="text-muted-foreground">No subjects assigned yet.</p>
            )}
            <p className="mt-3 font-medium">Classes assigned</p>
            <p className="text-muted-foreground">
              {member.classIds.length ? member.classIds.join(', ') : 'None'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
