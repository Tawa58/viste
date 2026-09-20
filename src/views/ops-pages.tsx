import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { catalogService } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import { runMockProcess } from '@/lib/notify'
import type {
  Announcement,
  AppUser,
  AuditLog,
  InventoryItem,
  LibraryBook,
  LibraryLoan,
  RolePermission,
  TransportRoute,
  UserRole,
} from '@/types'

export function ReportsPage() {
  const categories = [
    'Student Reports',
    'Attendance Reports',
    'Fee Reports',
    'Academic Reports',
    'Results Reports',
    'Staff Reports',
  ]
  const [busyAction, setBusyAction] = useState<string | null>(null)

  async function runReportAction(action: string, messages: { loading: string; success: string }) {
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
        title="Reports"
        description="Filter and export school reports (export backend later)."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }]}
        actions={
          <>
            <Button
              variant="outline"
              loading={busyAction === 'print'}
              onClick={() =>
                void runReportAction('print', {
                  loading: 'Preparing print…',
                  success: 'Report ready to print',
                })
              }
            >
              Print
            </Button>
            <Button
              loading={busyAction === 'export'}
              onClick={() =>
                void runReportAction('export', {
                  loading: 'Exporting report…',
                  success: 'Report exported',
                })
              }
            >
              Export
            </Button>
          </>
        }
      />
      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Input type="date" defaultValue="2026-01-01" />
          <Input type="date" defaultValue="2026-09-15" />
          <Select defaultValue="ay-2025">
            <option value="ay-2025">2025/2026</option>
            <option value="ay-2024">2024/2025</option>
          </Select>
          <Select defaultValue="t1">
            <option value="t1">Term 1</option>
            <option value="t2">Term 2</option>
            <option value="t3">Term 3</option>
          </Select>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c}>
            <CardContent className="p-5">
              <p className="font-display text-lg font-semibold">{c}</p>
              <p className="mt-1 text-sm text-muted-foreground">Ready for Spring Boot export jobs.</p>
              <Button
                className="mt-4"
                variant="outline"
                size="sm"
                loading={busyAction === c}
                onClick={() =>
                  void runReportAction(c, {
                    loading: `Opening ${c}…`,
                    success: `${c} opened`,
                  })
                }
              >
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function AnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    catalogService.getAnnouncements().then((a) => {
      setRows(a)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState message="Loading announcements…" />

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Create and publish school communications."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Announcements' }]}
        actions={<Button onClick={() => setOpen(true)}>Create announcement</Button>}
      />
      <div className="space-y-3">
        {rows.map((a) => (
          <Card key={a.id}>
            <CardContent className="space-y-2 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-lg font-semibold">{a.title}</h3>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-sm text-muted-foreground">{a.body}</p>
              <p className="text-xs text-muted-foreground">
                Audience: {a.audience.join(', ')} · {a.author}
                {a.publishedAt ? ` · ${formatDateTime(a.publishedAt)}` : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea />
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select defaultValue="Parents">
                <option>Parents</option>
                <option>Students</option>
                <option>Teachers</option>
                <option>All</option>
              </Select>
            </div>
            <Button
              loading={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true)
                  try {
                    await runMockProcess({
                      loading: 'Saving announcement draft…',
                      success: 'Announcement draft saved',
                    })
                    setOpen(false)
                  } finally {
                    setSaving(false)
                  }
                })()
              }}
            >
              Save draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function LibraryPage() {
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<LibraryBook[]>([])
  const [loans, setLoans] = useState<LibraryLoan[]>([])

  useEffect(() => {
    Promise.all([catalogService.getBooks(), catalogService.getLoans()]).then(([b, l]) => {
      setBooks(b)
      setLoans(l)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState message="Loading library…" />

  return (
    <div>
      <PageHeader
        title="Library"
        description="Books, borrowing, returns, and fines."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Library' }]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Catalogue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {books.map((b) => (
              <div key={b.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{b.title}</p>
                <p className="text-muted-foreground">
                  {b.author} · {b.category} · {b.available}/{b.copies} available
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Loans & fines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loans.map((l) => (
              <div key={l.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{books.find((b) => b.id === l.bookId)?.title}</p>
                <p className="text-muted-foreground">
                  Student {l.studentId} · due {l.dueAt}
                  {l.returnedAt ? ` · returned ${l.returnedAt}` : ' · out'}
                </p>
                <p>Fine: ${l.fine}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    catalogService.getInventory().then((i) => {
      setItems(i)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState message="Loading inventory…" />

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Assets, equipment, stock, and suppliers."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Inventory' }]}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="space-y-1 p-5 text-sm">
              <p className="font-display text-lg font-semibold">{item.name}</p>
              <p className="text-muted-foreground">
                {item.category} · {item.sku}
              </p>
              <p>Qty {item.quantity}</p>
              <p>{item.location}</p>
              <p className="text-muted-foreground">Supplier: {item.supplier}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function TransportPage() {
  const [routes, setRoutes] = useState<TransportRoute[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    catalogService.getTransport().then((r) => {
      setRoutes(r)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState message="Loading transport routes…" />

  return (
    <div>
      <PageHeader
        title="Transport"
        description="Vehicles, drivers, routes, and assigned students."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Transport' }]}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {routes.map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-2 p-5 text-sm">
              <p className="font-display text-lg font-semibold">{r.name}</p>
              <p>
                {r.vehicle} · Driver {r.driver}
              </p>
              <p>Fee ${r.fee}/term</p>
              <p className="text-muted-foreground">{r.studentIds.length} students assigned</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

const permissionGroups: Record<string, string[]> = {
  Students: ['students.view', 'students.create', 'students.update', 'students.delete'],
  Fees: ['fees.view', 'fees.create', 'fees.record_payment'],
  Attendance: ['attendance.view', 'attendance.record'],
  Results: ['results.view', 'results.enter', 'results.approve', 'results.publish'],
  Users: ['users.view', 'users.create', 'users.update'],
  Reports: ['reports.view', 'reports.export'],
  Settings: ['system.settings'],
}

export function UsersRolesPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<RolePermission[]>([])
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEACHER')
  const [draft, setDraft] = useState<string[]>([])

  useEffect(() => {
    Promise.all([catalogService.getUsers(), catalogService.getRolePermissions()]).then(
      ([u, r]) => {
        setUsers(u)
        setRoles(r)
        const current = r.find((x) => x.role === 'TEACHER')
        setDraft(current?.permissions ?? [])
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    const current = roles.find((x) => x.role === selectedRole)
    setDraft(current?.permissions ?? [])
  }, [selectedRole, roles])

  if (loading) return <LoadingState message="Loading users & roles…" />

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="RBAC management UI — permissions are visual only for now."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Users & Roles' }]}
      />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardContent className="space-y-2 p-5">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {u.email} · {u.role.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <StatusBadge status={u.status} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="roles">
          <Card>
            <CardContent className="space-y-4 p-5">
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="max-w-sm"
              >
                {roles.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.role}
                  </option>
                ))}
              </Select>
              {Object.entries(permissionGroups).map(([group, perms]) => (
                <div key={group}>
                  <p className="mb-2 text-sm font-semibold">{group}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {perms.map((p) => (
                      <label key={p} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={draft.includes(p)}
                          onCheckedChange={(checked) => {
                            setDraft((prev) =>
                              checked === true ? [...prev, p] : prev.filter((x) => x !== p),
                            )
                          }}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                onClick={() => {
                  setRoles((prev) =>
                    prev.map((r) => (r.role === selectedRole ? { ...r, permissions: draft } : r)),
                  )
                  void runMockProcess({
                    loading: 'Saving role permissions…',
                    success: 'Role permissions saved',
                  })
                }}
              >
                Save role permissions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')

  useEffect(() => {
    catalogService.getAuditLogs().then((a) => {
      setRows(a)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        r.action.toLowerCase().includes(q) ||
        r.record.toLowerCase().includes(q) ||
        r.user.toLowerCase().includes(q)
      const matchesModule = moduleFilter === 'all' || r.module === moduleFilter
      const matchesUser = userFilter === 'all' || r.user === userFilter
      return matchesSearch && matchesModule && matchesUser
    })
  }, [rows, search, moduleFilter, userFilter])

  if (loading) return <LoadingState message="Loading audit logs…" />

  const modules = [...new Set(rows.map((r) => r.module))]
  const users = [...new Set(rows.map((r) => r.user))]

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Trace sensitive actions across the platform."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Audit Logs' }]}
      />
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <SearchInput value={search} onChange={setSearch} className="md:col-span-2" />
            <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="all">All modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
              <option value="all">All users</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="grid gap-2 rounded-lg border border-border p-3 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
              >
                <div>
                  <p className="font-medium">{r.user}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.at)}</p>
                </div>
                <p>{r.action}</p>
                <p>{r.module}</p>
                <p className="text-muted-foreground">{r.record}</p>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
