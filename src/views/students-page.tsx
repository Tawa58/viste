import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  GraduationCap,
  MoreHorizontal,
  Plus,
  School,
  Users,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { canManageStudents } from '@/lib/roles'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { Pagination } from '@/components/shared/pagination'
import { TableSkeleton } from '@/components/shared/loading-state'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  StudentEditorForm,
  studentToFormValues,
  type StudentFormValues,
} from '@/components/shared/student-editor-form'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
import { catalogService, studentService } from '@/services/api'
import { cn, fullName } from '@/lib/utils'
import type { Guardian, SchoolClass, Stream, Student, Subject } from '@/types'

const PAGE_SIZE = 8

export function StudentsPage() {
  const { user } = useAuth()
  const canManage = user ? canManageStudents(user.role) : false
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [streamFilter, setStreamFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState<'name' | 'number'>('name')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentFormValues>(studentToFormValues())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      studentService.list(),
      catalogService.getClasses(),
      catalogService.getStreams(),
      catalogService.getSubjects(),
      catalogService.getGuardians(),
    ])
      .then(([s, c, st, sub, g]) => {
        if (!mounted) return
        setStudents(s)
        setClasses(c)
        setStreams(st)
        setSubjects(sub)
        setGuardians(g)
      })
      .catch((err) => {
        console.error(err)
        notify.error(
          'Could not load students',
          'Firestore rules are blocking reads. Publish open rules from firestore.rules in the Firebase Console.',
        )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
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
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id))

  useEffect(() => {
    setPage(1)
  }, [search, classFilter, streamFilter, statusFilter, sort])

  function openCreate() {
    const defaultClass = classes[0]
    const defaultStream = streams.find((s) => s.classId === defaultClass?.id)
    setEditing(null)
    setForm({
      ...studentToFormValues(),
      classId: defaultClass?.id ?? '',
      streamId: defaultStream?.id ?? '',
      subjectIds: ['sub-math', 'sub-eng', 'sub-sci'],
    })
    setFormOpen(true)
  }

  function openEdit(student: Student) {
    setEditing(student)
    setForm(studentToFormValues(student))
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      notify.error('First and last name are required')
      return
    }
    if (!form.classId || !form.streamId) {
      notify.error('Class and stream are required')
      return
    }
    if (form.subjectIds.length === 0) {
      notify.error('Select at least one subject')
      return
    }

    setSaving(true)
    try {
      const seq = students.length + 1
      const payload = {
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
        classId: form.classId,
        streamId: form.streamId,
        subjectIds: form.subjectIds,
        guardianIds: form.guardianIds,
        studentNumber:
          form.studentNumber.trim() ||
          `VHS-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`,
        admissionNumber:
          form.admissionNumber.trim() || `ADM-${String(24000 + seq)}`,
      }

      if (editing) {
        const updated = await notify.process(() => studentService.update(editing.id, payload), {
          loading: 'Updating student…',
          success: 'Student profile updated',
        })
        setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      } else {
        const created = await notify.process(() => studentService.create(payload), {
          loading: 'Registering student…',
          success: 'Student registered',
        })
        setStudents((prev) => [created, ...prev])
      }
      setFormOpen(false)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <TableSkeleton rows={6} message="Loading students…" />

  return (
    <div className="space-y-5">
      <PageHeader
        title="Students"
        description="Browse, register, and manage the school student directory."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Students' }]}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus /> Register student
            </Button>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/80 shadow-card">
        <div className="space-y-4 border-b border-border/70 bg-muted/25 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name or student number…"
              className="md:col-span-2 xl:col-span-2"
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
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students found"
            description="Try adjusting filters or register a new student."
            className="m-6"
          />
        ) : (
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={allPageSelected}
                  onCheckedChange={(checked) => {
                    if (checked === true) {
                      setSelected((prev) => [
                        ...new Set([...prev, ...pageRows.map((r) => r.id)]),
                      ])
                    } else {
                      const ids = new Set(pageRows.map((r) => r.id))
                      setSelected((prev) => prev.filter((id) => !ids.has(id)))
                    }
                  }}
                  aria-label="Select page"
                />
                Select page
              </label>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">{filtered.length} students</p>
                <Select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as 'name' | 'number')}
                  className="h-8 w-auto"
                >
                  <option value="name">Sort by name</option>
                  <option value="number">Sort by number</option>
                </Select>
              </div>
            </div>

            <ul className="divide-y divide-border/70">
              {pageRows.map((s) => {
                const cls = classes.find((c) => c.id === s.classId)?.name ?? '—'
                const stream = streams.find((st) => st.id === s.streamId)?.name ?? '—'
                const subjectCount = s.subjectIds?.length ?? 0
                return (
                  <li key={s.id} className="px-4 py-3.5 transition hover:bg-muted/30 sm:px-5">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        className="mt-3"
                        checked={selected.includes(s.id)}
                        onCheckedChange={(checked) => {
                          setSelected((prev) =>
                            checked === true
                              ? [...prev, s.id]
                              : prev.filter((id) => id !== s.id),
                          )
                        }}
                        aria-label={`Select ${fullName(s)}`}
                      />
                      <Link
                        to={`/students/${s.id}`}
                        className={cn(
                          'flex min-w-0 flex-1 items-start gap-3 rounded-xl outline-none',
                          'focus-visible:ring-2 focus-visible:ring-ring',
                        )}
                      >
                        <Avatar name={fullName(s)} className="mt-0.5 h-11 w-11 text-sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-foreground">{fullName(s)}</p>
                            <StatusBadge status={s.status} />
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5" />
                              {s.studentNumber}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <School className="h-3.5 w-3.5" />
                              {cls} {stream}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {subjectCount} subjects
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5" asChild>
                          <Link to={`/students/${s.id}`}>
                            View
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/students/${s.id}`}>View profile</Link>
                            </DropdownMenuItem>
                            {canManage ? (
                              <DropdownMenuItem onClick={() => openEdit(s)}>
                                Edit registration
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem asChild>
                                <Link to={`/students/${s.id}`}>Update contact info</Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="border-t border-border/70 px-4 py-3 sm:px-5">
              <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit student' : 'Register student'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update profile, enrolment, subjects, and linked guardians.'
                : 'Capture profile details, class placement, subjects, and guardians.'}
            </DialogDescription>
          </DialogHeader>
          <StudentEditorForm
            mode={editing ? 'edit' : 'create'}
            values={form}
            onChange={setForm}
            classes={classes}
            streams={streams}
            subjects={subjects}
            guardians={guardians}
            fullAccess
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              {editing ? 'Save changes' : 'Register student'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
