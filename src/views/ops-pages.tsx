import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { catalogService } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import { runMockProcess } from '@/lib/notify'
import type { Announcement, LibraryBook, LibraryLoan } from '@/types'

export { ReportsPage } from '@/views/reports-page'
export { InventoryPage } from '@/views/inventory-page'
export { TransportPage } from '@/views/transport-page'
export { UsersRolesPage } from '@/views/users-roles-page'
export { AuditLogsPage } from '@/views/audit-logs-page'

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
            <Field>
              <Label>Title</Label>
              <Input />
            </Field>
            <Field>
              <Label>Body</Label>
              <Textarea />
            </Field>
            <Field>
              <Label>Audience</Label>
              <Select defaultValue="Parents">
                <option>Parents</option>
                <option>Students</option>
                <option>Teachers</option>
                <option>All</option>
              </Select>
            </Field>
            <Button
              loading={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true)
                  try {
                    await runMockProcess({
                      loading: 'Saving announcement…',
                      success: 'Announcement saved',
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
            {loans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active loans.</p>
            ) : (
              loans.map((l) => (
                <div key={l.id} className="rounded-lg border border-border p-3 text-sm">
                  <p>Book {l.bookId}</p>
                  <p className="text-muted-foreground">
                    Student {l.studentId} · due {l.dueAt}
                    {l.fine ? ` · fine ${l.fine}` : ''}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
