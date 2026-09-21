import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth-context'
import { EDUCATION_LEVELS, educationLevelName } from '@/lib/education-levels'
import { notify } from '@/lib/notify'
import { canManageAcademics } from '@/lib/roles'
import { catalogService, subjectAdminService } from '@/services/api'
import type { Staff, Subject } from '@/types'
import { BookOpen } from 'lucide-react'

type SubjectForm = {
  code: string
  name: string
  category: string
  educationLevelIds: string[]
  teacherIds: string[]
  active: boolean
}

const emptyForm = (): SubjectForm => ({
  code: '',
  name: '',
  category: 'Core',
  educationLevelIds: [],
  teacherIds: [],
  active: true,
})

export function SubjectsPage() {
  const { user } = useAuth()
  const canManage = user ? canManageAcademics(user.role) : false
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [levelFilter, setLevelFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  async function reload() {
    const [s, sf] = await Promise.all([
      subjectAdminService.list(),
      catalogService.getStaff(),
    ])
    setSubjects(s)
    setStaff(sf)
  }

  useEffect(() => {
    reload()
      .catch((err) => {
        console.error(err)
        notify.error('Could not load subjects')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (levelFilter === 'all') return subjects
    return subjects.filter(
      (s) =>
        !s.educationLevelIds?.length ||
        s.educationLevelIds.includes(levelFilter),
    )
  }, [subjects, levelFilter])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(subject: Subject) {
    setEditing(subject)
    setForm({
      code: subject.code,
      name: subject.name,
      category: subject.category,
      educationLevelIds: [...(subject.educationLevelIds ?? [])],
      teacherIds: [...(subject.teacherIds ?? [])],
      active: subject.active ?? true,
    })
    setOpen(true)
  }

  function toggleLevel(id: string) {
    setForm((f) => ({
      ...f,
      educationLevelIds: f.educationLevelIds.includes(id)
        ? f.educationLevelIds.filter((x) => x !== id)
        : [...f.educationLevelIds, id],
    }))
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      notify.error('Code and name are required')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await notify.process(() => subjectAdminService.update(editing.id, form), {
          loading: 'Saving subject…',
          success: 'Subject updated',
        })
      } else {
        await notify.process(() => subjectAdminService.create(form), {
          loading: 'Creating subject…',
          success: 'Subject created',
        })
      }
      setOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading subjects…" />

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Assign subjects to education levels so registration only shows relevant options."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Subjects' }]}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add subject
            </Button>
          ) : null
        }
      />

      <div className="mb-4">
        <Select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="max-w-xs"
        >
          <option value="all">All education levels</option>
          {EDUCATION_LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects"
          description="Create subjects and assign them to ECD, primary, or secondary levels."
          actionLabel={canManage ? 'Add subject' : undefined}
          onAction={canManage ? openCreate : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((subject) => (
            <Card key={subject.id} className="shadow-card">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {subject.name}{' '}
                      <span className="text-muted-foreground">({subject.code})</span>
                    </p>
                    <Badge variant="outline">{subject.category}</Badge>
                    {(subject.active ?? true) ? null : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Levels:{' '}
                    {subject.educationLevelIds?.length
                      ? subject.educationLevelIds.map(educationLevelName).join(', ')
                      : 'All levels'}
                  </p>
                </div>
                {canManage ? (
                  <Button size="sm" variant="outline" onClick={() => openEdit(subject)}>
                    Edit
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit subject' : 'Create subject'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="MATH"
                />
              </Field>
              <Field>
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </Field>
            </div>
            <Field>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Education levels</Label>
              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-border p-3">
                {EDUCATION_LEVELS.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.educationLevelIds.includes(l.id)}
                      onCheckedChange={() => toggleLevel(l.id)}
                    />
                    {l.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to offer this subject at every level.
              </p>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))}
              />
              Active
            </label>
          </div>
          <Button loading={saving} onClick={() => void save()}>
            Save subject
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
