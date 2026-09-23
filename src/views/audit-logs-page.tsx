import { useEffect, useMemo, useState } from 'react'
import { Download, KeyRound, LogIn, LogOut, RefreshCw } from 'lucide-react'
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
import { downloadReportPdf } from '@/lib/reports-export'
import { cn, formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/types'

function actionKind(action: string): 'login' | 'logout' | 'other' {
  if (action === 'auth.login') return 'login'
  if (action === 'auth.logout') return 'logout'
  return 'other'
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<'all' | 'login' | 'logout' | 'actions'>('all')
  const [schoolName, setSchoolName] = useState('Viste High School')

  async function reload() {
    const [a, profile] = await Promise.all([
      catalogService.getAuditLogs(),
      catalogService.getSchoolProfile().catch(() => null),
    ])
    setRows(a)
    if (profile?.name) setSchoolName(profile.name)
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

  function exportPdf() {
    if (filtered.length === 0) {
      notify.info('No audit rows to export')
      return
    }
    try {
      downloadReportPdf({
        schoolName,
        filename: `viste-audit-log-${today()}`,
        table: {
          title: 'Audit log',
          headers: ['#', 'When', 'Who', 'Email', 'Role', 'What happened', 'Module', 'Status'],
          rows: filtered.map((r, i) => [
            String(i + 1),
            formatDateTime(r.at),
            r.actorName || r.user,
            r.actorEmail || '—',
            r.actorRole ? roleLabel(r.actorRole) : '—',
            r.summary || r.action.replaceAll('.', ' · '),
            r.module,
            r.status,
          ]),
          summary: `${filtered.length} event(s) · filters applied`,
        },
      })
      notify.success('Audit log PDF downloaded')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not create PDF')
    }
  }

  if (loading) return <LoadingState message="Loading audit logs…" />

  return (
    <div className="text-[12px] leading-snug">
      <PageHeader
        title="Audit Logs"
        description="Who signed in, when, and what they changed."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Audit Logs' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={exportPdf} disabled={filtered.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true)
                reload()
                  .catch(() => notify.error('Could not refresh'))
                  .finally(() => setLoading(false))
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sign-ins" value={String(stats.logins)} icon={LogIn} compact />
        <StatCard label="Sign-outs" value={String(stats.logouts)} icon={LogOut} compact />
        <StatCard label="Actions" value={String(stats.actions)} icon={KeyRound} compact />
        <StatCard label="Shown" value={String(filtered.length)} icon={KeyRound} compact />
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-4">
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
            className="h-9 text-xs"
          >
            <option value="all">All events</option>
            <option value="login">Sign-ins only</option>
            <option value="logout">Sign-outs only</option>
            <option value="actions">Actions only</option>
          </Select>
        </Field>
        <Field>
          <Label className="sr-only">Module</Label>
          <Select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="h-9 text-xs"
          >
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
          <Select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="h-9 text-xs"
          >
            <option value="all">All people</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {filtered.length} event{filtered.length === 1 ? '' : 's'} in view
        </p>
        <Button type="button" size="sm" onClick={exportPdf} disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5" />
          Download audit PDF
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
          No audit events match these filters yet.
        </p>
      ) : (
        <DataTableShell>
          <DataTable className="min-w-[720px] text-[11px]">
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="px-2 py-1.5 text-[10px]">When</DataTableHeaderCell>
                <DataTableHeaderCell className="px-2 py-1.5 text-[10px]">Who</DataTableHeaderCell>
                <DataTableHeaderCell className="px-2 py-1.5 text-[10px]">
                  What happened
                </DataTableHeaderCell>
                <DataTableHeaderCell className="px-2 py-1.5 text-[10px]">Module</DataTableHeaderCell>
                <DataTableHeaderCell className="px-2 py-1.5 text-[10px]">Status</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {filtered.map((r) => {
                const kind = actionKind(r.action)
                return (
                  <DataTableRow key={r.id} className="border-border/50">
                    <DataTableCell className="whitespace-nowrap px-2 py-1 text-[11px] text-muted-foreground">
                      {formatDateTime(r.at)}
                    </DataTableCell>
                    <DataTableCell className="px-2 py-1">
                      <p className="text-[11px] font-medium leading-tight">
                        {r.actorName || r.user}
                      </p>
                      <p className="text-[10px] leading-tight text-muted-foreground">
                        {r.actorEmail || '—'}
                        {r.actorRole ? ` · ${roleLabel(r.actorRole)}` : ''}
                      </p>
                    </DataTableCell>
                    <DataTableCell className="px-2 py-1">
                      <div className="flex items-start gap-1.5">
                        {kind === 'login' ? (
                          <LogIn className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                        ) : kind === 'logout' ? (
                          <LogOut className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <KeyRound className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium leading-tight">
                            {r.summary || r.action.replaceAll('.', ' · ')}
                          </p>
                          <p className="truncate text-[10px] leading-tight text-muted-foreground">
                            {r.record}
                          </p>
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell className="px-2 py-1 text-[11px]">{r.module}</DataTableCell>
                    <DataTableCell className="px-2 py-1">
                      <span
                        className={cn(
                          'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                          r.status === 'SUCCESS' && 'bg-success/15 text-success',
                          r.status === 'FAILED' && 'bg-destructive/15 text-destructive',
                          r.status === 'WARNING' && 'bg-warning/15 text-warning',
                        )}
                      >
                        {r.status}
                      </span>
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
