import { useEffect, useMemo, useState } from 'react'
import { Dumbbell, Plus, Puzzle, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth-context'
import { notify } from '@/lib/notify'
import { canManageAcademics } from '@/lib/roles'
import { catalogService, extracurricularService } from '@/services/api'
import type { ClubActivity, ClubActivityType, House, Sport, SportKitItem, Staff } from '@/types'
import { staffCategoryLabel } from '@/lib/staff-categories'

type SportForm = {
  name: string
  description: string
  active: boolean
  coachStaffId: string
  leaderStaffId: string
  medicStaffIds: string[]
  officialStaffIds: string[]
  kits: SportKitItem[]
}

const emptySportForm = (): SportForm => ({
  name: '',
  description: '',
  active: true,
  coachStaffId: '',
  leaderStaffId: '',
  medicStaffIds: [],
  officialStaffIds: [],
  kits: [],
})

export function SportsPage() {
  const { user } = useAuth()
  const canManage = user ? canManageAcademics(user.role) : false
  const [loading, setLoading] = useState(true)
  const [sports, setSports] = useState<Sport[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Sport | null>(null)
  const [form, setForm] = useState(emptySportForm)
  const [saving, setSaving] = useState(false)

  const activeStaff = useMemo(
    () =>
      staff
        .filter((s) => s.status === 'ACTIVE' && !s.suspension)
        .sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
        ),
    [staff],
  )

  async function reload() {
    const [sp, st] = await Promise.all([
      extracurricularService.listSports(),
      catalogService.getStaff().catch(() => [] as Staff[]),
    ])
    setSports(sp)
    setStaff(st)
  }

  useEffect(() => {
    reload()
      .catch(() => notify.error('Could not load sports'))
      .finally(() => setLoading(false))
  }, [])

  function staffName(id?: string) {
    if (!id) return null
    const s = staff.find((x) => x.id === id)
    return s ? `${s.firstName} ${s.lastName}` : null
  }

  function openCreate() {
    setEditing(null)
    setForm(emptySportForm())
    setOpen(true)
  }

  function openEdit(sport: Sport) {
    setEditing(sport)
    setForm({
      name: sport.name,
      description: sport.description ?? '',
      active: sport.active,
      coachStaffId: sport.coachStaffId ?? '',
      leaderStaffId: sport.leaderStaffId ?? '',
      medicStaffIds: [...(sport.medicStaffIds ?? [])],
      officialStaffIds: [...(sport.officialStaffIds ?? [])],
      kits: (sport.kits ?? []).map((k) => ({ ...k })),
    })
    setOpen(true)
  }

  function toggleStaffId(key: 'medicStaffIds' | 'officialStaffIds', id: string) {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id],
    }))
  }

  function addKit() {
    setForm((f) => ({
      ...f,
      kits: [
        ...f.kits,
        { id: `kit-${Date.now()}`, name: '', quantity: 0, jerseyNumbers: '', notes: '' },
      ],
    }))
  }

  function updateKit(id: string, patch: Partial<SportKitItem>) {
    setForm((f) => ({
      ...f,
      kits: f.kits.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    }))
  }

  function removeKit(id: string) {
    setForm((f) => ({ ...f, kits: f.kits.filter((k) => k.id !== id) }))
  }

  async function save() {
    if (!form.name.trim()) {
      notify.error('Sport name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        active: form.active,
        coachStaffId: form.coachStaffId || '',
        leaderStaffId: form.leaderStaffId || '',
        medicStaffIds: form.medicStaffIds,
        officialStaffIds: form.officialStaffIds,
        kits: form.kits
          .filter((k) => k.name.trim())
          .map((k) => ({
            id: k.id,
            name: k.name.trim(),
            quantity: Number(k.quantity) || 0,
            jerseyNumbers: k.jerseyNumbers?.trim() || undefined,
            notes: k.notes?.trim() || undefined,
          })),
      }
      if (editing) {
        await notify.process(() => extracurricularService.updateSport(editing.id, payload), {
          loading: 'Saving…',
          success: 'Sport updated',
        })
      } else {
        await notify.process(() => extracurricularService.createSport(payload), {
          loading: 'Creating…',
          success: 'Sport added',
        })
      }
      setOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading sports…" />

  return (
    <div>
      <PageHeader
        title="Sports"
        description="Manage sports, coaching staff, officials, and kit inventory."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Sports' }]}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add sport
            </Button>
          ) : null
        }
      />
      {sports.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No sports yet"
          description="Add football, athletics, swimming, or any sport your school offers."
          actionLabel={canManage ? 'Add sport' : undefined}
          onAction={canManage ? openCreate : undefined}
        />
      ) : (
        <div className="space-y-2">
          {sports.map((sport) => {
            const coach = staffName(sport.coachStaffId)
            const leader = staffName(sport.leaderStaffId)
            const kitCount = sport.kits?.reduce((sum, k) => sum + (k.quantity || 0), 0) ?? 0
            return (
              <div
                key={sport.id}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 py-3 last:border-0"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{sport.name}</p>
                    {!sport.active ? <Badge variant="secondary">Inactive</Badge> : null}
                  </div>
                  {sport.description ? (
                    <p className="text-sm text-muted-foreground">{sport.description}</p>
                  ) : null}
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {[
                      coach ? `Coach: ${coach}` : null,
                      leader ? `Leader: ${leader}` : null,
                      sport.medicStaffIds?.length
                        ? `Medics: ${sport.medicStaffIds.length}`
                        : null,
                      sport.officialStaffIds?.length
                        ? `Officials: ${sport.officialStaffIds.length}`
                        : null,
                      sport.kits?.length
                        ? `Kits: ${sport.kits.length} items (${kitCount} units)`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No coaching or kit details yet'}
                  </p>
                </div>
                {canManage ? (
                  <Button size="sm" variant="outline" onClick={() => openEdit(sport)}>
                    Edit
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit sport' : 'Add sport'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field className="sm:col-span-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <Field className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <Field>
                <Label>Coach</Label>
                <Select
                  value={form.coachStaffId}
                  onChange={(e) => setForm((f) => ({ ...f, coachStaffId: e.target.value }))}
                >
                  <option value="">Not assigned</option>
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} · {staffCategoryLabel(s.category)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <Label>Leader</Label>
                <Select
                  value={form.leaderStaffId}
                  onChange={(e) => setForm((f) => ({ ...f, leaderStaffId: e.target.value }))}
                >
                  <option value="">Not assigned</option>
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} · {staffCategoryLabel(s.category)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <Label>Medics / first aiders</Label>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {activeStaff.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active staff registered.</p>
                  ) : (
                    activeStaff.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.medicStaffIds.includes(s.id)}
                          onCheckedChange={() => toggleStaffId('medicStaffIds', s.id)}
                        />
                        <span>
                          {s.firstName} {s.lastName}
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            · {s.title || s.category || 'Staff'}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </Field>
              <Field>
                <Label>Sporting officials / leadership</Label>
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {activeStaff.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active staff registered.</p>
                  ) : (
                    activeStaff.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.officialStaffIds.includes(s.id)}
                          onCheckedChange={() => toggleStaffId('officialStaffIds', s.id)}
                        />
                        <span>
                          {s.firstName} {s.lastName}
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            · {s.title || s.category || 'Staff'}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </Field>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Kits & equipment</p>
                  <p className="text-xs text-muted-foreground">
                    Jerseys, balls, cones, bibs — include jersey numbers where relevant.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addKit}>
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </Button>
              </div>
              {form.kits.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  No kit items yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.kits.map((kit) => (
                    <div
                      key={kit.id}
                      className="grid gap-2 rounded-lg border border-border/80 p-2.5 sm:grid-cols-[1.4fr_0.6fr_1fr_auto]"
                    >
                      <Input
                        placeholder="Item (e.g. Jerseys, Balls)"
                        value={kit.name}
                        onChange={(e) => updateKit(kit.id, { name: e.target.value })}
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={kit.quantity}
                        onChange={(e) =>
                          updateKit(kit.id, { quantity: Number(e.target.value) || 0 })
                        }
                      />
                      <Input
                        placeholder="Jersey nos (e.g. 1–15)"
                        value={kit.jerseyNumbers ?? ''}
                        onChange={(e) => updateKit(kit.id, { jerseyNumbers: e.target.value })}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeKit(kit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Input
                        className="sm:col-span-4"
                        placeholder="Notes (optional)"
                        value={kit.notes ?? ''}
                        onChange={(e) => updateKit(kit.id, { notes: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))}
              />
              Active
            </label>
          </div>
          <Button loading={saving} onClick={() => void save()}>
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ClubsPage() {
  const { user } = useAuth()
  const canManage = user ? canManageAcademics(user.role) : false
  const [loading, setLoading] = useState(true)
  const [clubs, setClubs] = useState<ClubActivity[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [open, setOpen] = useState(false)
  const [houseOpen, setHouseOpen] = useState(false)
  const [editing, setEditing] = useState<ClubActivity | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<ClubActivityType>('CLUB')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [houseName, setHouseName] = useState('')
  const [saving, setSaving] = useState(false)

  async function reload() {
    const [c, h] = await Promise.all([
      extracurricularService.listClubs(),
      extracurricularService.listHouses(),
    ])
    setClubs(c)
    setHouses(h)
  }

  useEffect(() => {
    reload()
      .catch(() => notify.error('Could not load clubs'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setEditing(null)
    setName('')
    setType('CLUB')
    setDescription('')
    setActive(true)
    setOpen(true)
  }

  function openEdit(club: ClubActivity) {
    setEditing(club)
    setName(club.name)
    setType(club.type)
    setDescription(club.description ?? '')
    setActive(club.active)
    setOpen(true)
  }

  async function save() {
    if (!name.trim()) {
      notify.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        active,
      }
      if (editing) {
        await notify.process(() => extracurricularService.updateClub(editing.id, payload), {
          loading: 'Saving…',
          success: 'Updated',
        })
      } else {
        await notify.process(() => extracurricularService.createClub(payload), {
          loading: 'Creating…',
          success: 'Added',
        })
      }
      setOpen(false)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  async function saveHouse() {
    if (!houseName.trim()) return
    setSaving(true)
    try {
      await notify.process(
        () => extracurricularService.createHouse({ name: houseName.trim(), active: true }),
        { loading: 'Adding house…', success: 'House added' },
      )
      setHouseOpen(false)
      setHouseName('')
      await reload()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading clubs…" />

  return (
    <div>
      <PageHeader
        title="Clubs & Activities"
        description="Manage clubs, societies, activities, and school houses."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Clubs & Activities' }]}
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setHouseOpen(true)}>
                Add house
              </Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add club / activity
              </Button>
            </div>
          ) : null
        }
      />

      {houses.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">Houses</h3>
          <div className="flex flex-wrap gap-2">
            {houses.map((h) => (
              <Badge key={h.id} variant={h.active ? 'default' : 'secondary'}>
                {h.name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {clubs.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="No clubs or activities"
          description="Add debate club, choir, prefect body, or any school activity."
          actionLabel={canManage ? 'Add club / activity' : undefined}
          onAction={canManage ? openCreate : undefined}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clubs.map((club) => (
            <Card key={club.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{club.name}</p>
                    <Badge variant="outline">{club.type}</Badge>
                  </div>
                  {club.description ? (
                    <p className="text-sm text-muted-foreground">{club.description}</p>
                  ) : null}
                </div>
                {canManage ? (
                  <Button size="sm" variant="outline" onClick={() => openEdit(club)}>
                    Edit
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} club / activity</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <Label>Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as ClubActivityType)}>
                <option value="CLUB">Club</option>
                <option value="SOCIETY">Society</option>
                <option value="ACTIVITY">Activity</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
              Active
            </label>
          </div>
          <Button loading={saving} onClick={() => void save()}>
            Save
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={houseOpen} onOpenChange={setHouseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add house</DialogTitle>
          </DialogHeader>
          <Field>
            <Label>House name</Label>
            <Input value={houseName} onChange={(e) => setHouseName(e.target.value)} />
          </Field>
          <Button loading={saving} onClick={() => void saveHouse()}>
            Add house
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
