import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Plus, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { Pagination } from '@/components/shared/pagination'
import { TableSkeleton } from '@/components/shared/loading-state'
import { EmptyState } from '@/components/shared/empty-state'
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
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { catalogService, studentService } from '@/services/api'
import { fullName } from '@/lib/utils'
import type { SchoolClass, Stream, Student } from '@/types'

const PAGE_SIZE = 5

export function StudentsPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [streamFilter, setStreamFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<'name' | 'number'>('name')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      studentService.list(),
      catalogService.getClasses(),
      catalogService.getStreams(),
    ]).then(([s, c, st]) => {
      setStudents(s)
      setClasses(c)
      setStreams(st)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let rows = students.filter((s) => {
      const name = fullName(s).toLowerCase()
      const matchesSearch =
        !q ||
        name.includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q)
      const matchesClass = classFilter === 'all' || s.classId === classFilter
      const matchesStream = streamFilter === 'all' || s.streamId === streamFilter
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter
      return matchesSearch && matchesClass && matchesStream && matchesStatus
    })
    rows = [...rows].sort((a, b) =>
      sort === 'name'
        ? fullName(a).localeCompare(fullName(b))
        : a.studentNumber.localeCompare(b.studentNumber),
    )
    return rows
  }, [students, search, classFilter, streamFilter, statusFilter, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, classFilter, streamFilter, statusFilter, sort])

  if (loading) return <TableSkeleton rows={6} />

  return (
    <div>
      <PageHeader
        title="Students"
        description="Search, filter, and manage student records."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Students' }]}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Add student
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search students…"
              className="xl:col-span-2"
            />
            <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="all">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={streamFilter} onChange={(e) => setStreamFilter(e.target.value)}>
              <option value="all">All streams</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="GRADUATED">Graduated</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {filtered.length} students · {selected.length} selected
            </p>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'name' | 'number')}
              className="w-44"
            >
              <option value="name">Sort by name</option>
              <option value="number">Sort by number</option>
            </Select>
          </div>

          {pageRows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students found"
              description="Try adjusting filters or search."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTableShell>
                  <DataTable>
                    <DataTableHead>
                      <tr>
                        <DataTableHeaderCell>
                          <Checkbox
                            checked={
                              pageRows.every((r) => selected.includes(r.id)) && pageRows.length > 0
                            }
                            onCheckedChange={(checked) => {
                              if (checked === true) {
                                setSelected((prev) => [
                                  ...new Set([...prev, ...pageRows.map((r) => r.id)]),
                                ])
                              } else {
                                setSelected((prev) =>
                                  prev.filter((id) => !pageRows.some((r) => r.id === id)),
                                )
                              }
                            }}
                          />
                        </DataTableHeaderCell>
                        <DataTableHeaderCell>Student</DataTableHeaderCell>
                        <DataTableHeaderCell>Number</DataTableHeaderCell>
                        <DataTableHeaderCell>Class</DataTableHeaderCell>
                        <DataTableHeaderCell>Status</DataTableHeaderCell>
                        <DataTableHeaderCell />
                      </tr>
                    </DataTableHead>
                    <DataTableBody>
                      {pageRows.map((s) => {
                        const cls = classes.find((c) => c.id === s.classId)?.name ?? '—'
                        const stream = streams.find((st) => st.id === s.streamId)?.name ?? '—'
                        return (
                          <DataTableRow key={s.id}>
                            <DataTableCell>
                              <Checkbox
                                checked={selected.includes(s.id)}
                                onCheckedChange={(checked) => {
                                  setSelected((prev) =>
                                    checked === true
                                      ? [...prev, s.id]
                                      : prev.filter((id) => id !== s.id),
                                  )
                                }}
                              />
                            </DataTableCell>
                            <DataTableCell>
                              <Link
                                to={`/students/${s.id}`}
                                className="font-semibold text-primary hover:underline"
                              >
                                {fullName(s)}
                              </Link>
                            </DataTableCell>
                            <DataTableCell className="text-muted-foreground">
                              {s.studentNumber}
                            </DataTableCell>
                            <DataTableCell>
                              {cls} · {stream}
                            </DataTableCell>
                            <DataTableCell>
                              <StatusBadge status={s.status} />
                            </DataTableCell>
                            <DataTableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to={`/students/${s.id}`}>View profile</Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setFormOpen(true)}>
                                    Edit (mock)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </DataTableCell>
                          </DataTableRow>
                        )
                      })}
                    </DataTableBody>
                  </DataTable>
                </DataTableShell>
              </div>

              <div className="grid gap-3 md:hidden">
                {pageRows.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-border/80 bg-card p-4 shadow-card transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link to={`/students/${s.id}`} className="font-semibold text-primary">
                          {fullName(s)}
                        </Link>
                        <p className="text-xs text-muted-foreground">{s.studentNumber}</p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {classes.find((c) => c.id === s.classId)?.name} ·{' '}
                      {streams.find((st) => st.id === s.streamId)?.name}
                    </p>
                  </div>
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add / Edit student</DialogTitle>
            <DialogDescription>UI mock form — not persisted.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input placeholder="First name" />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input placeholder="Last name" />
            </div>
            <div className="space-y-2">
              <Label>Admission number</Label>
              <Input placeholder="ADM-…" />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select defaultValue={classes[0]?.id}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setFormOpen(false)
                toast.success('Student saved (mock)')
              }}
            >
              Save mock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
