import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, KeyRound, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ProfilePhotoUpload } from '@/components/shared/profile-photo-upload'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingState } from '@/components/shared/loading-state'
import { LoginCredentialsCard } from '@/components/shared/login-credentials-card'
import { notify } from '@/lib/notify'
import { canViewStaffCredentials } from '@/lib/roles'
import { useAuth } from '@/contexts/auth-context'
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
import { Checkbox } from '@/components/ui/checkbox'
import { catalogService, classService } from '@/services/api'
import type { SchoolClass, Staff, StaffLoginCredential, Subject } from '@/types'

const emptyForm = {
  firstName: '',
  lastName: '',
  department: '',
  title: '',
  email: '',
  phone: '',
  password: '',
  photoUrl: undefined as string | undefined,
  profilePhotoId: undefined as string | undefined,
}

function classNamesForStaff(staff: Staff, classes: SchoolClass[]) {
  const fromIds = (staff.classIds ?? [])
    .map((id) => classes.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[]
  const fromTeacher = classes
    .filter((c) => c.classTeacherId === staff.id && (c.status ?? 'ACTIVE') !== 'ARCHIVED')
    .map((c) => c.name)
  return [...new Set([...fromIds, ...fromTeacher])]
}

function downloadCredentialsCsv(
  staff: Staff[],
  credentials: StaffLoginCredential[],
  classes: SchoolClass[],
) {
  const header = ['Name', 'Email / login', 'Password', 'Role', 'Classes', 'Status']
  const lines = staff.map((s) => {
    const cred = credentials.find((c) => c.staffId === s.id)
    const assigned = classNamesForStaff(s, classes).join('; ')
    return [
      `${s.firstName} ${s.lastName}`,
      cred?.email || s.email,
      cred?.password || '',
      cred?.role || 'TEACHER',
      assigned,
      cred?.temporaryPassword ? 'Temp password' : cred ? 'Active' : 'No login',
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(',')
  })
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `teacher-logins-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function TeachersPage() {
  const { user } = useAuth()
  const showCredentials = user ? canViewStaffCredentials(user.role) : false
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<Staff[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [credentials, setCredentials] = useState<StaffLoginCredential[]>([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let mounted = true
    Promise.all([
      catalogService.getStaff(),
      catalogService.getSubjects(),
      classService.list().catch(() => [] as SchoolClass[]),
      showCredentials ? catalogService.getStaffCredentials() : Promise.resolve([]),
    ])
      .then(([s, sub, cls, creds]) => {
        if (!mounted) return
        setStaff(s)
        setSubjects(sub)
        setClasses(cls)
        setCredentials(creds)
      })
      .catch((err) => {
        console.error(err)
        notify.error('Could not load teachers', 'Check that you are signed in and try again.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [showCredentials])

  const rows = useMemo(() => {
    const q = search.toLowerCase()
    return staff.filter(
      (s) =>
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.employeeNumber.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    )
  }, [staff, search])

  async function handleCreate() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      notify.error('First and last name are required', 'Complete the required fields to continue.')
      return
    }
    const email =
      form.email.trim() ||
      `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@viste.school`
    const password = form.password.trim()
    if (password && password.length < 8) {
      notify.error(
        'Password too short',
        'Use at least 8 characters, or leave blank to auto-generate.',
      )
      return
    }
    setSaving(true)
    try {
      const created = await notify.process(
        () =>
          catalogService.createStaff({
            employeeNumber: `EMP-${1000 + staff.length + 1}`,
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email,
            phone: form.phone.trim() || '—',
            department: form.department.trim() || 'General',
            title: form.title.trim() || 'Staff',
            status: 'ACTIVE',
            subjectIds: [],
            classIds: [],
            hireDate: new Date().toISOString().slice(0, 10),
            photoUrl: form.photoUrl,
            profilePhotoId: form.profilePhotoId,
            ...(password ? { password } : {}),
          }),
        {
          loading: 'Creating staff and auth account…',
          success: 'Staff added — open View all logins for their email and password',
          error: 'Could not add staff member',
        },
      )
      setStaff((prev) => [created, ...prev])
      if (showCredentials) {
        setCredentials(await catalogService.getStaffCredentials())
        setCredOpen(true)
      }
      setForm(emptyForm)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading staff directory…" />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teachers & Staff"
        description={
          showCredentials
            ? 'Staff directory, portal logins, and assigned classes.'
            : 'Staff directory, departments, and assigned classes.'
        }
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Teachers & Staff' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {showCredentials ? (
              <Button variant="outline" onClick={() => setCredOpen(true)}>
                <KeyRound /> View all logins
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setForm(emptyForm)
                setOpen(true)
              }}
            >
              <Plus /> Add staff
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search staff…" />
          <div className="grid gap-3">
            {rows.map((s) => {
              const fullName = `${s.firstName} ${s.lastName}`
              const cred = credentials.find((c) => c.staffId === s.id)
              const assigned = classNamesForStaff(s, classes)
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
                        Classes: {assigned.length ? assigned.join(', ') : 'None assigned'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Subjects:{' '}
                        {s.subjectIds
                          .map((id) => subjects.find((x) => x.id === id)?.name)
                          .filter(Boolean)
                          .join(', ') || '—'}
                      </p>
                      {showCredentials && cred ? (
                        <p className="mt-1 truncate text-xs font-medium text-foreground/80">
                          Login: {cred.email}
                          {cred.password ? ' · Password on sheet' : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showCredentials ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/teachers/${s.id}`}>Credentials</Link>
                      </Button>
                    ) : null}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add staff member</DialogTitle>
            <DialogDescription>
              Creates a staff profile and portal login for the teacher.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ProfilePhotoUpload
              name={`${form.firstName || 'New'} ${form.lastName || 'Staff'}`}
              previewUrl={form.photoUrl}
              fileId={form.profilePhotoId}
              access={{
                userId: user?.id ?? 'anonymous',
                role: user?.role ?? 'SCHOOL_ADMIN',
                staffId: user?.staffId,
              }}
              ownerId="pending-staff"
              ownerType="staff"
              fileType="staff_photo"
              onChange={(next) =>
                setForm((f) => ({
                  ...f,
                  photoUrl: next?.previewUrl,
                  profilePhotoId: next?.fileId,
                }))
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email (login)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@viste.school"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              {showCredentials ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Portal password (optional)</Label>
                  <Input
                    type="text"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-xs text-muted-foreground">
                    Saved on the admin login sheet. Marked as a temporary password until they change
                    it.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleCreate()}>
              Save staff
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Teacher login sheet</DialogTitle>
            <DialogDescription>
              Email / username and admin-issued passwords. Use Reset if a password is missing
              (older accounts created before passwords were stored).
            </DialogDescription>
          </DialogHeader>
          <div className="mb-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadCredentialsCsv(staff, credentials, classes)
                notify.success('Login sheet downloaded')
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </Button>
          </div>
          <div className="grid gap-3">
            {staff.map((s) => {
              const cred = credentials.find((c) => c.staffId === s.id)
              return (
                <LoginCredentialsCard
                  key={s.id}
                  staffName={`${s.firstName} ${s.lastName}`}
                  credential={cred}
                  onReset={async () => {
                    const next = await notify.process(
                      () => catalogService.resetStaffPassword(s.id),
                      {
                        loading: 'Issuing temporary password…',
                        success: 'Temporary password ready — copy it from the card',
                        error: 'Could not reset password',
                      },
                    )
                    setCredentials((prev) => {
                      const others = prev.filter((c) => c.staffId !== s.id)
                      return [...others, next]
                    })
                  }}
                />
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function TeacherDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const showCredentials = user ? canViewStaffCredentials(user.role) : false
  const canConfigureAccess = user
    ? user.role === 'SUPER_ADMIN' ||
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'PRINCIPAL'
    : false
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<Staff | undefined>()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [credential, setCredential] = useState<StaffLoginCredential | null | undefined>()
  const [savingPhoto, setSavingPhoto] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      catalogService.getStaffMember(id),
      catalogService.getSubjects(),
      classService.list().catch(() => [] as SchoolClass[]),
      showCredentials ? catalogService.getStaffCredential(id) : Promise.resolve(undefined),
    ]).then(([s, sub, cls, cred]) => {
      setMember(s)
      setSubjects(sub)
      setClasses(cls)
      setCredential(cred ?? null)
      setLoading(false)
    })
  }, [id, showCredentials])

  async function handlePhotoChange(next: { fileId: string; previewUrl: string } | undefined) {
    if (!member) return
    setSavingPhoto(true)
    try {
      const updated = await catalogService.updateStaffPhoto(member.id, {
        profilePhotoId: next?.fileId ?? null,
        photoUrl: next?.previewUrl ?? null,
      })
      if (updated) setMember(updated)
    } finally {
      setSavingPhoto(false)
    }
  }

  if (loading) return <LoadingState message="Loading staff profile…" />
  if (!member) return <p>Staff member not found.</p>

  const fullName = `${member.firstName} ${member.lastName}`
  const assignedClasses = classNamesForStaff(member, classes)

  return (
    <div className="space-y-5">
      <PageHeader
        title={fullName}
        description={`${member.title} · ${member.department}`}
        breadcrumbs={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Teachers', to: '/teachers' },
          { label: member.lastName },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-5 p-5">
            <ProfilePhotoUpload
              name={fullName}
              previewUrl={member.photoUrl}
              fileId={member.profilePhotoId}
              access={{
                userId: user?.id ?? 'anonymous',
                role: user?.role ?? 'SCHOOL_ADMIN',
                staffId: user?.staffId ?? member.id,
              }}
              ownerId={member.id}
              ownerType="staff"
              fileType="staff_photo"
              onChange={(next) => void handlePhotoChange(next)}
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

        <div className="space-y-4">
          {showCredentials ? (
            <LoginCredentialsCard
              staffName={fullName}
              credential={credential}
              onReset={async () => {
                const next = await notify.process(
                  () => catalogService.resetStaffPassword(member.id),
                  {
                    loading: 'Issuing temporary password…',
                    success: 'Temporary password ready — copy it from the card',
                    error: 'Could not reset password',
                  },
                )
                setCredential(next)
              }}
            />
          ) : null}

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
              {assignedClasses.length ? (
                assignedClasses.map((name) => <p key={name}>{name}</p>)
              ) : (
                <p className="text-muted-foreground">
                  None — assign as class teacher on a class.
                </p>
              )}
            </CardContent>
          </Card>

          {canConfigureAccess ? (
            <TeacherAccessPanel staffId={member.id} staffName={fullName} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

type StaffAccessPayload = {
  staffId: string
  roleDefaults: string[]
  assignable: string[]
  groups: { label: string; permissions: string[] }[]
  overrides: { grant?: string[]; deny?: string[] }
  effective: string[]
  selected: string[]
}

function TeacherAccessPanel({
  staffId,
  staffName,
}: {
  staffId: string
  staffName: string
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [access, setAccess] = useState<StaffAccessPayload | null>(null)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    catalogService
      .getStaffAccess(staffId)
      .then((data) => {
        if (!mounted) return
        setAccess(data)
        setSelected(data.selected)
      })
      .catch((err) => {
        console.error(err)
        notify.error('Could not load teacher access settings')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [staffId])

  async function save() {
    setSaving(true)
    try {
      const next = await notify.process(
        () => catalogService.updateStaffAccess(staffId, selected),
        {
          loading: 'Saving teacher access…',
          success: `Access updated for ${staffName}`,
          error: 'Could not save access',
        },
      )
      setAccess(next)
      setSelected(next.selected)
    } finally {
      setSaving(false)
    }
  }

  function resetToDefaults() {
    if (!access) return
    setSelected([...access.roleDefaults].filter((p) => access.assignable.includes(p)))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">Loading access…</CardContent>
      </Card>
    )
  }

  if (!access) return null

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="font-medium">What this teacher can see & do</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tick modules and actions for {staffName}. They only see students in their assigned
            classes. Changes apply on their next request (within ~20 seconds).
          </p>
        </div>
        {access.groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-sm font-semibold">{group.label}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.permissions.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.includes(perm)}
                    onCheckedChange={(checked) => {
                      setSelected((prev) =>
                        checked === true
                          ? [...new Set([...prev, perm])]
                          : prev.filter((p) => p !== perm),
                      )
                    }}
                  />
                  <span className="font-mono text-xs">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button loading={saving} onClick={() => void save()}>
            Save access
          </Button>
          <Button type="button" variant="outline" onClick={resetToDefaults}>
            Reset to teacher defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
