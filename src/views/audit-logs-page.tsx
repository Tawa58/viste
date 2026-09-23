import { useEffect, useMemo, useState } from 'react'
import { KeyRound, LogIn, LogOut, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { StatCard } from '@/components/shared/stat-card'
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
import { Label } from '@/components/ui/label'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { catalogService } from '@/services/api'
import { notify } from '@/lib/notify'
import { roleLabel } from '@/lib/permission-labels'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/types'

function actionKind(action: string): 'login' | 'logout' | 'other' {
  if (action === 'auth.login') return 'login'
  if (action === 'auth.logout') return 'logout'
  return 'other'
}

export function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<'all' | 'login' | 'logout' | 'actions'>('all')

  async function reload() {
    const a = await catalogService.getAuditLogs()
    setRows(a)
  }

  useEffect(() => {
    reload()
      .catch((err) => {
        console.error(err)
        notify.error('Could not load audit logs')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const kind = actionKind(r.action)
      const matchesKind =
        kindFilter === 'all' ||
        (kindFilter === 'login' && kind === 'login') ||
        (kindFilter === 'logout' && kind === 'logout') ||
        (kindFilter === 'actions' && kind === 'other')
      const hay = `${r.user} ${r.actorEmail || ''} ${r.action} ${r.record} ${r.summary || ''} ${r.module}`
      const matchesSearch = !q || hay.toLowerCase().includes(q)
      const matchesModule = moduleFilter === 'all' || r.module === moduleFilter
      const who = r.actorName || r.user
      const matchesUser = userFilter === 'all' || who === userFilter
      return matchesKind && matchesSearch && matchesModule && matchesUser
    })
  }, [rows, search, moduleFilter, userFilter, kindFilter])

  const modules = [...new Set(rows.map((r) => r.module))].sort()
  const users = [...new Set(rows.map((r) => r.actorName || r.user))].sort()

  const stats = useMemo(() => {
    const logins = rows.filter((r) => r.action === 'auth.login').length
    const logouts = rows.filter((r) => r.action === 'auth.logout').length
    const actions = rows.length - logins - logouts
    return { logins, logouts, actions, total: rows.length }
  }, [rows])

  if (loading) return <LoadingState message="Loading audit logs…" />

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Who signed in, when, and what they changed in the school system."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Audit Logs' }]}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setLoading(true)
              reload()
                .catch(() => notify.error('Could not refresh'))
                .finally(() => setLoading(false))
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sign-ins recorded" value={String(stats.logins)} icon={LogIn} compact />
        <StatCard label="Sign-outs" value={String(stats.logouts)} icon={LogOut} compact />
        <StatCard label="Other actions" value={String(stats.actions)} icon={KeyRound} compact />
        <StatCard label="Events shown" value={String(stats.total)} icon={KeyRound} compact />
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <SearchInput
          id="audit-search"
          name="audit-search"
          value={search}
          onChange={setSearch}
          placeholder="Search person, action, record…"
          className="md:col-span-2"
        />
        <Field>
          <Label className="sr-only">Event type</Label>
          <Select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
          >
            <option value="all">All events</option>
            <option value="login">Sign-ins only</option>
            <option value="logout">Sign-outs only</option>
            <option value="actions">Actions only</option>
          </Select>
        </Field>
        <Field>
          <Label className="sr-only">Module</Label>
          <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <Field className="md:col-span-2 lg:col-span-1">
          <Label className="sr-only">User</Label>
          <Select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="all">All people</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No audit events match these filters yet. Sign-ins and admin actions appear here
          automatically.
        </p>
      ) : (
        <DataTableShell>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>When</DataTableHeaderCell>
                <DataTableHeaderCell>Who</DataTableHeaderCell>
                <DataTableHeaderCell>What happened</DataTableHeaderCell>
                <DataTableHeaderCell>Module</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {filtered.map((r) => {
                const kind = actionKind(r.action)
                return (
                  <DataTableRow key={r.id}>
                    <DataTableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(r.at)}
                    </DataTableCell>
                    <DataTableCell>
                      <p className="font-medium">{r.actorName || r.user}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.actorEmail || '—'}
                        {r.actorRole ? ` · ${roleLabel(r.actorRole)}` : ''}
                      </p>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-start gap-2">
                        {kind === 'login' ? (
                          <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        ) : kind === 'logout' ? (
                          <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {r.summary || r.action.replaceAll('.', ' · ')}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.record}</p>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-sm">{r.module}</DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={r.status} />
                    </DataTableCell>
                  </DataTableRow>
                )
              })}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  )
}
