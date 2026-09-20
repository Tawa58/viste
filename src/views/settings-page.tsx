import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert } from '@/components/shared/alert'
import { PageHeader } from '@/components/shared/page-header'
import { ProfilePhotoUpload } from '@/components/shared/profile-photo-upload'
import { notify, runMockProcess } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/auth-context'
import {
  canManageSchoolSettings,
  defaultTitleForRole,
  formatRoleLabel,
  isStaffRole,
} from '@/lib/roles'
import type { AuthUser } from '@/types'

type ProfileForm = {
  name: string
  email: string
  phone: string
  title: string
  department: string
  employeeNumber: string
  bio: string
  preferredLanguage: 'en' | 'sn' | 'nd'
  timezone: string
  avatarUrl?: string
  avatarFileId?: string
  notifyEmail: boolean
  notifySms: boolean
  notifyInApp: boolean
}

function toForm(user: AuthUser): ProfileForm {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    title: user.title ?? defaultTitleForRole(user.role),
    department: user.department ?? '',
    employeeNumber: user.employeeNumber ?? '',
    bio: user.bio ?? '',
    preferredLanguage: user.preferredLanguage ?? 'en',
    timezone: user.timezone ?? 'Africa/Harare',
    avatarUrl: user.avatarUrl,
    avatarFileId: user.avatarFileId,
    notifyEmail: user.notificationPrefs?.email ?? true,
    notifySms: user.notificationPrefs?.sms ?? false,
    notifyInApp: user.notificationPrefs?.inApp ?? true,
  }
}

export function SettingsPage() {
  const { user, updateProfile, changePassword } = useAuth()
  const [params, setParams] = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  })

  const staff = user ? isStaffRole(user.role) : false
  const schoolAdmin = user ? canManageSchoolSettings(user.role) : false

  const allowedTabs = useMemo(() => {
    const tabs = ['profile', 'notifications', 'security', 'appearance'] as const
    const extra: string[] = []
    if (user?.role === 'TEACHER') extra.push('teaching')
    if (user?.role === 'PARENT') extra.push('family')
    if (user?.role === 'STUDENT') extra.push('student')
    if (schoolAdmin) extra.push('school', 'academic', 'fees', 'grading')
    return [...tabs, ...extra]
  }, [schoolAdmin, user?.role])

  const activeTab = allowedTabs.includes(params.get('tab') ?? '')
    ? (params.get('tab') as string)
    : 'profile'

  useEffect(() => {
    if (user) setForm(toForm(user))
  }, [user])

  if (!user || !form) return null

  function setTab(tab: string) {
    setParams(tab === 'profile' ? {} : { tab })
  }

  async function saveProfile(partial?: Partial<ProfileForm>) {
    const nextForm = { ...form!, ...partial }
    setForm(nextForm)
    setSaving(true)
    try {
      await notify.process(
        () =>
          updateProfile({
            name: nextForm.name.trim(),
            email: nextForm.email.trim(),
            phone: nextForm.phone.trim() || undefined,
            title: nextForm.title.trim() || undefined,
            department: staff ? nextForm.department.trim() || undefined : undefined,
            employeeNumber: staff ? nextForm.employeeNumber.trim() || undefined : undefined,
            bio: nextForm.bio.trim() || undefined,
            preferredLanguage: nextForm.preferredLanguage,
            timezone: nextForm.timezone,
            avatarUrl: nextForm.avatarUrl,
            notificationPrefs: {
              email: nextForm.notifyEmail,
              sms: nextForm.notifySms,
              inApp: nextForm.notifyInApp,
            },
          }),
        {
          loading: 'Saving profile…',
          success: 'Profile settings saved',
          error: 'Could not save settings',
        },
      )
    } catch {
      // toast already shown
    } finally {
      setSaving(false)
    }
  }

  async function savePhoto(next: { fileId: string; previewUrl: string } | undefined) {
    setForm((f) =>
      f
        ? {
            ...f,
            avatarUrl: next?.previewUrl,
            avatarFileId: next?.fileId,
          }
        : f,
    )
    setSaving(true)
    try {
      await notify.process(
        () =>
          updateProfile({
            avatarUrl: next?.previewUrl,
            avatarFileId: next?.fileId,
          }),
        {
          loading: 'Updating photo…',
          success: 'Profile photo saved',
          error: 'Could not update photo',
        },
      )
    } catch {
      // toast already shown
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description={`Manage your ${formatRoleLabel(user.role).toLowerCase()} profile, preferences, and ${schoolAdmin ? 'school configuration' : 'account options'}.`}
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Settings' }]}
      />

      <Tabs value={activeTab} onValueChange={setTab}>
        <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
          <TabsTrigger value="profile">My profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          {user.role === 'TEACHER' && <TabsTrigger value="teaching">Teaching</TabsTrigger>}
          {user.role === 'PARENT' && <TabsTrigger value="family">Family</TabsTrigger>}
          {user.role === 'STUDENT' && <TabsTrigger value="student">Student</TabsTrigger>}
          {schoolAdmin && (
            <>
              <TabsTrigger value="school">School</TabsTrigger>
              <TabsTrigger value="academic">Academic</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="grading">Grading</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>
                  Fields shown depend on your role. Staff updates also sync to the staff directory when linked.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ProfilePhotoUpload
                  name={form.name || user.name}
                  previewUrl={form.avatarUrl}
                  fileId={form.avatarFileId}
                  disabled={saving}
                  access={{
                    userId: user.id,
                    role: user.role,
                    staffId: user.staffId,
                    studentId: user.studentId,
                    guardianId: user.guardianId,
                  }}
                  ownerId={user.staffId ?? user.studentId ?? user.id}
                  ownerType={user.staffId ? 'staff' : user.studentId ? 'student' : 'user'}
                  fileType={user.staffId ? 'staff_photo' : 'profile_photo'}
                  onChange={(next) => void savePhoto(next)}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="profile-name">Full name</Label>
                    <Input
                      id="profile-name"
                      value={form.name}
                      onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Work email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value } : f))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Phone</Label>
                    <Input
                      id="profile-phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value } : f))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-title">Title / position</Label>
                    <Input
                      id="profile-title"
                      value={form.title}
                      onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={formatRoleLabel(user.role)} disabled />
                  </div>

                  {staff && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="profile-dept">Department</Label>
                        <Input
                          id="profile-dept"
                          value={form.department}
                          onChange={(e) =>
                            setForm((f) => (f ? { ...f, department: e.target.value } : f))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-emp">Employee number</Label>
                        <Input
                          id="profile-emp"
                          value={form.employeeNumber}
                          onChange={(e) =>
                            setForm((f) => (f ? { ...f, employeeNumber: e.target.value } : f))
                          }
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="profile-lang">Preferred language</Label>
                    <Select
                      id="profile-lang"
                      value={form.preferredLanguage}
                      onChange={(e) =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                preferredLanguage: e.target.value as ProfileForm['preferredLanguage'],
                              }
                            : f,
                        )
                      }
                    >
                      <option value="en">English</option>
                      <option value="sn">Shona</option>
                      <option value="nd">Ndebele</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-tz">Timezone</Label>
                    <Select
                      id="profile-tz"
                      value={form.timezone}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, timezone: e.target.value } : f))
                      }
                    >
                      <option value="Africa/Harare">Africa/Harare</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                      <option value="UTC">UTC</option>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="profile-bio">About / notes</Label>
                    <Textarea
                      id="profile-bio"
                      rows={4}
                      value={form.bio}
                      onChange={(e) => setForm((f) => (f ? { ...f, bio: e.target.value } : f))}
                      placeholder="Short professional summary for your profile"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setForm(toForm(user))}
                    disabled={saving}
                  >
                    Reset
                  </Button>
                  <Button disabled={saving} onClick={() => void saveProfile()}>
                    {saving ? 'Saving…' : 'Save profile'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account summary</CardTitle>
                <CardDescription>What this role can manage in Settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border border-border/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
                <div className="rounded-lg border border-border/70 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Role access</p>
                  <p className="font-medium">{formatRoleLabel(user.role)}</p>
                  <p className="mt-1 text-muted-foreground">
                    {schoolAdmin
                      ? 'Full school configuration, users, and personal profile.'
                      : staff
                        ? 'Staff profile, notifications, security, and teaching tools.'
                        : user.role === 'PARENT'
                          ? 'Family contacts, fee notices, and result alerts.'
                          : 'Student profile, result notices, and appearance.'}
                  </p>
                </div>
                {user.staffId && (
                  <Alert title="Linked staff record" tone="info">
                    Profile photo and contact details sync with Teachers & Staff ({user.staffId}).
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
              <CardDescription>Choose how Viste contacts you for school updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ['notifyEmail', 'Email alerts', 'Receipts, announcements, and result releases'],
                  ['notifySms', 'SMS alerts', 'Urgent attendance and fee reminders'],
                  ['notifyInApp', 'In-app alerts', 'Dashboard and header notifications'],
                ] as const
              ).map(([key, label, hint]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                  </div>
                  <Switch
                    checked={form[key]}
                    onCheckedChange={(checked) =>
                      setForm((f) => (f ? { ...f, [key]: checked } : f))
                    }
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <Button disabled={saving} onClick={() => void saveProfile()}>
                  Save notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Password and session controls (mock UI for Phase 1).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Current password</Label>
                  <Input
                    type="password"
                    value={passwordForm.current}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, current: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input
                    type="password"
                    value={passwordForm.next}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm new password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) =>
                      setPasswordForm((f) => ({ ...f, confirm: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Require re-authentication for fee actions</p>
                  <p className="text-xs text-muted-foreground">Recommended for finance and admin roles</p>
                </div>
                <Switch defaultChecked={schoolAdmin || user.role === 'ACCOUNTANT'} />
              </div>
              <Button
                onClick={() => {
                  if (!passwordForm.current || !passwordForm.next) {
                    notify.error('Enter current and new passwords')
                    return
                  }
                  if (passwordForm.next.length < 8) {
                    notify.error('New password must be at least 8 characters')
                    return
                  }
                  if (passwordForm.next !== passwordForm.confirm) {
                    notify.error('New passwords do not match')
                    return
                  }
                  void (async () => {
                    try {
                      await notify.process(
                        () => changePassword(passwordForm.current, passwordForm.next),
                        {
                          loading: 'Updating password…',
                          success:
                            'Password updated — temporary password tag cleared on the admin login sheet',
                          error: 'Could not update password',
                        },
                      )
                      setPasswordForm({ current: '', next: '', confirm: '' })
                    } catch {
                      /* notify.process already surfaced */
                    }
                  })()
                }}
              >
                Update password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Theme follows the header switcher for light and dark mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert title="Theme control" tone="info">
                Use the sun/moon control in the top bar. School brand colors stay consistent across roles.
              </Alert>
              <Button
                variant="outline"
                onClick={() =>
                  void runMockProcess({
                    loading: 'Resetting appearance…',
                    success: 'Appearance reset to school defaults',
                  })
                }
              >
                Reset appearance defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === 'TEACHER' && (
          <TabsContent value="teaching">
            <Card>
              <CardHeader>
                <CardTitle>Teaching preferences</CardTitle>
                <CardDescription>Classroom defaults for attendance and mark entry.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default class for attendance</Label>
                    <Select defaultValue="cls-f3">
                      <option value="cls-f3">Form 3</option>
                      <option value="cls-f4">Form 4</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mark entry workflow</Label>
                    <Select defaultValue="draft">
                      <option value="draft">Save as draft first</option>
                      <option value="submit">Submit for review</option>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Show late students first</p>
                    <p className="text-xs text-muted-foreground">Prioritise follow-up during roll call</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button
                  onClick={() =>
                    void runMockProcess({
                      loading: 'Saving teaching settings…',
                      success: 'Teaching preferences saved',
                    })
                  }
                >
                  Save teaching settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {user.role === 'PARENT' && (
          <TabsContent value="family">
            <Card>
              <CardHeader>
                <CardTitle>Family preferences</CardTitle>
                <CardDescription>Parent/guardian contact and result access options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Preferred contact method</Label>
                  <Select defaultValue="email">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="call">Phone call</option>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Fee balance reminders</p>
                    <p className="text-xs text-muted-foreground">Weekly summary for linked students</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button
                  onClick={() =>
                    void runMockProcess({
                      loading: 'Saving family preferences…',
                      success: 'Family preferences saved',
                    })
                  }
                >
                  Save family settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {user.role === 'STUDENT' && (
          <TabsContent value="student">
            <Card>
              <CardHeader>
                <CardTitle>Student preferences</CardTitle>
                <CardDescription>Portal display and result notification options.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">Notify when results are published</p>
                    <p className="text-xs text-muted-foreground">In-app alert only for this demo account</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button
                  onClick={() =>
                    void runMockProcess({
                      loading: 'Saving student preferences…',
                      success: 'Student preferences saved',
                    })
                  }
                >
                  Save student settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {schoolAdmin &&
          (
            [
              ['school', 'School profile', 'School name, address, contacts, motto, and branding.'],
              ['academic', 'Academic structure', 'Year structure, promotion rules, and streams.'],
              ['fees', 'Fee policy', 'Currency, receipt numbering, and fee-gate rules.'],
            ] as const
          ).map(([value, title, text]) => (
            <TabsContent key={value} value={value}>
              <Card>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert title="Admin configuration" tone="info">
                    Visible to school leadership roles. Persistence arrives with Spring Boot.
                  </Alert>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Primary setting</Label>
                      <Input placeholder="Value" />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary setting</Label>
                      <Input placeholder="Value" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">Enable this module</p>
                      <p className="text-xs text-muted-foreground">Mock toggle for Phase 1</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Button
                    onClick={() =>
                      void runMockProcess({
                        loading: `Saving ${title}…`,
                        success: `${title} saved`,
                      })
                    }
                  >
                    Save {title}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

        {schoolAdmin ? (
          <TabsContent value="grading">
            <GradingScalePanel />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  )
}

function GradingScalePanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passMark, setPassMark] = useState(50)
  const [bands, setBands] = useState<
    { grade: string; minPercent: number; maxPercent: number }[]
  >([])

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const { catalogService } = await import('@/services/api')
        const scale = await catalogService.getGradingScale()
        if (!mounted) return
        setPassMark(scale.passMark)
        setBands(scale.bands)
      } catch (err) {
        console.error(err)
        notify.error('Could not load grading scale')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function save() {
    setSaving(true)
    try {
      const { catalogService } = await import('@/services/api')
      const next = await notify.process(
        () => catalogService.updateGradingScale({ passMark, bands }),
        {
          loading: 'Saving grading scale…',
          success: 'Grading scale saved — new marks will use these bands',
          error: 'Could not save grading scale',
        },
      )
      setBands(next.bands)
      setPassMark(next.passMark)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading grading scale…</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grading scale</CardTitle>
        <CardDescription>
          When teachers enter monthly test scores, letter grades are assigned automatically from
          these percent bands (e.g. 85–100 = A).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-xs">
          <Label>Pass mark (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={passMark}
            onChange={(e) => setPassMark(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Grade bands</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setBands((prev) => [...prev, { grade: '', minPercent: 0, maxPercent: 0 }])
              }
            >
              Add band
            </Button>
          </div>
          <div className="space-y-2">
            {bands.map((band, index) => (
              <div key={index} className="grid grid-cols-[80px_1fr_1fr_auto] gap-2">
                <Input
                  placeholder="A"
                  value={band.grade}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((b, i) => (i === index ? { ...b, grade: e.target.value } : b)),
                    )
                  }
                />
                <Input
                  type="number"
                  placeholder="Min %"
                  value={band.minPercent}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((b, i) =>
                        i === index ? { ...b, minPercent: Number(e.target.value) } : b,
                      ),
                    )
                  }
                />
                <Input
                  type="number"
                  placeholder="Max %"
                  value={band.maxPercent}
                  onChange={(e) =>
                    setBands((prev) =>
                      prev.map((b, i) =>
                        i === index ? { ...b, maxPercent: Number(e.target.value) } : b,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setBands((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
        <Button loading={saving} onClick={() => void save()}>
          Save grading scale
        </Button>
      </CardContent>
    </Card>
  )
}
