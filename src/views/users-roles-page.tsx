import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Shield } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { SearchInput } from '@/components/shared/search-input'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { catalogService } from '@/services/api'
import { useAuth } from '@/contexts/auth-context'
import { notify } from '@/lib/notify'
import {
  ASSIGNABLE_CONSOLE_ROLES,
  PERMISSION_GROUPS,
  permissionLabel,
  roleLabel,
} from '@/lib/permission-labels'
import { formatDateTime } from '@/lib/utils'
import type { AppUser, RolePermission, UserRole } from '@/types'

export function UsersRolesPage() {
  const { hasPermission } = useAuth()
  const canManageRoles = hasPermission('roles.manage')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<RolePermission[]>([])
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEACHER')
  const [draft, setDraft] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'REGISTRAR' as string,
    title: '',
  })

  async function reload() {
    const [u, r] = await Promise.all([
      catalogService.getUsers(),
      catalogService.getRolePermissions(),
    ])
    setUsers(u)
    setRoles(r)
    const current = r.find((x) => x.role === selectedRole) || r[0]
    if (current) {
      setSelectedRole(current.role)
      setDraft(current.permissions)
    }
  }

  useEffect(() => {
    reload()
      .catch((err) => {
        console.error(err)
        notify.error('Could not load users & roles')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const current = roles.find((x) => x.role === selectedRole)
    setDraft(current?.permissions ?? [])
  }, [selectedRole, roles])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users
      .filter((u) => {
        if (!q) return true
        return `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q)
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [users, search])

  const selectedMatrix = roles.find((r) => r.role === selectedRole)
  const locked = Boolean(selectedMatrix?.locked)

  async function saveRole() {
    if (locked) {
      notify.info('This role matrix is locked')
      return
    }
    setSaving(true)
    try {
      const next = await catalogService.updateRolePermissions({
        role: selectedRole,
        permissions: draft,
      })
      setRoles((prev) => prev.map((r) => (r.role === next.role ? next : r)))
      setDraft(next.permissions)
      notify.success(`Saved ${roleLabel(selectedRole)} permissions`)
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save role')
    } finally {
      setSaving(false)
    }
  }

  async function createUser() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
      notify.error('Name, email, and password (8+ chars) are required')
      return
    }
    setSaving(true)
    try {
      await catalogService.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        title: form.title.trim() || undefined,
      })
      notify.success('User created')
      setCreateOpen(false)
      setForm({ name: '', email: '', password: '', role: 'REGISTRAR', title: '' })
      await reload()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not create user')
    } finally {
      setSaving(false)
    }
  }

  async function saveUserEdit() {
    if (!editUser) return
    setSaving(true)
    try {
      await catalogService.updateUser(editUser.id, {
        name: editUser.name,
        role: editUser.role,
        status: editUser.status,
        title: editUser.title,
      })
      notify.success('User updated')
      setEditUser(null)
      await reload()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not update user')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading users & roles…" />

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage who can sign in, their role, and what each role is allowed to do."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Users & Roles' }]}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add user
          </Button>
        }
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 space-y-4">
          <SearchInput
            id="users-search"
            name="users-search"
            value={search}
            onChange={setSearch}
            placeholder="Search name, email, or role…"
          />
          {filteredUsers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No users found.
            </p>
          ) : (
            <DataTableShell>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>User</DataTableHeaderCell>
                    <DataTableHeaderCell>Role</DataTableHeaderCell>
                    <DataTableHeaderCell>Last login</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                    <DataTableHeaderCell />
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {filteredUsers.map((u) => (
                    <DataTableRow key={u.id}>
                      <DataTableCell>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        {u.title ? (
                          <p className="text-xs text-muted-foreground">{u.title}</p>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell>{roleLabel(u.role)}</DataTableCell>
                      <DataTableCell className="text-sm text-muted-foreground">
                        {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}
                      </DataTableCell>
                      <DataTableCell>
                        <StatusBadge status={u.status} />
                      </DataTableCell>
                      <DataTableCell>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditUser({ ...u })}>
                          Edit
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableShell>
          )}
          <p className="text-xs text-muted-foreground">
            Teachers can also be registered under{' '}
            <Link to="/teachers" className="underline">
              Teachers
            </Link>
            . Fine-tune one teacher’s access from their profile.
          </p>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role matrix
              </CardTitle>
              <CardDescription>
                Permissions control what each role can do in the console. Teacher-specific
                overrides still live on the teacher profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field className="max-w-sm">
                <Label>Role</Label>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                >
                  {roles.map((r) => (
                    <option key={r.role} value={r.role}>
                      {roleLabel(r.role)}
                      {r.locked ? ' (locked)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              {locked ? (
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {roleLabel(selectedRole)} permissions are fixed by the system and cannot be
                  changed here.
                </p>
              ) : null}

              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-sm font-semibold">{group.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.permissions.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={draft.includes(p)}
                          disabled={locked}
                          onCheckedChange={(checked) => {
                            setDraft((prev) =>
                              checked === true ? [...prev, p] : prev.filter((x) => x !== p),
                            )
                          }}
                        />
                        <span>
                          <span className="font-medium">{permissionLabel(p)}</span>
                          <span className="ml-1 text-xs text-muted-foreground">({p})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <Button
                type="button"
                disabled={locked || !canManageRoles}
                loading={saving}
                onClick={() => void saveRole()}
              >
                Save role permissions
              </Button>
              {!canManageRoles ? (
                <p className="text-xs text-muted-foreground">
                  You can review roles here. Saving changes requires the roles.manage permission.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add console user</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label>Full name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field className="sm:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Temporary password</Label>
              <Input
                type="text"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Role</Label>
              <Select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ASSIGNABLE_CONSOLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field className="sm:col-span-2">
              <Label>Title (optional)</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={() => void createUser()}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {editUser ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <Label>Name</Label>
                <Input
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </Field>
              <Field className="sm:col-span-2">
                <Label>Email</Label>
                <Input value={editUser.email} disabled />
              </Field>
              <Field>
                <Label>Role</Label>
                <Select
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value as UserRole })
                  }
                  disabled={editUser.role === 'SUPER_ADMIN'}
                >
                  {editUser.role === 'SUPER_ADMIN' ? (
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  ) : null}
                  {ASSIGNABLE_CONSOLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label>Status</Label>
                <Select
                  value={editUser.status}
                  onChange={(e) =>
                    setEditUser({
                      ...editUser,
                      status: e.target.value as 'ACTIVE' | 'DISABLED',
                    })
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </Select>
              </Field>
              <Field className="sm:col-span-2">
                <Label>Title</Label>
                <Input
                  value={editUser.title || ''}
                  onChange={(e) => setEditUser({ ...editUser, title: e.target.value })}
                />
              </Field>
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={() => void saveUserEdit()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
