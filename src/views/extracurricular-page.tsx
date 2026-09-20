import { useEffect, useState } from 'react'
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
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/auth-context'
import { notify } from '@/lib/notify'
import { canManageAcademics } from '@/lib/roles'
import { extracurricularService } from '@/services/api'
import type { ClubActivity, ClubActivityType, House, Sport } from '@/types'
import { Dumbbell, Puzzle } from 'lucide-react'

export function SportsPage() {
  const { user } = useAuth()
  const canManage = user ? canManageAcademics(user.role) : false
  const [loading, setLoading] = useState(true)
  const [sports, setSports] = useState<Sport[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Sport | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)

  async function reload() {
    setSports(await extracurricularService.listSports())
  }

  useEffect(() => {
    reload()
      .catch(() => notify.error('Could not load sports'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setEditing(null)
    setName('')
    setDescription('')
    setActive(true)
    setOpen(true)
  }

  function openEdit(sport: Sport) {
    setEditing(sport)
    setName(sport.name)
    setDescription(sport.description ?? '')
    setActive(sport.active)
    setOpen(true)
  }

  async function save() {
    if (!name.trim()) {
      notify.error('Sport name is required')
      return
    }
    setSaving(true)
    try {
      const payload = { name: name.trim(), description: description.trim() || undefined, active }
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
        description="Manage school sports available for student registration."
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
        <div className="grid gap-3 md:grid-cols-2">
          {sports.map((sport) => (
            <Card key={sport.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{sport.name}</p>
                  {sport.description ? (
                    <p className="text-sm text-muted-foreground">{sport.description}</p>
                  ) : null}
                  {!sport.active ? <Badge variant="secondary">Inactive</Badge> : null}
                </div>
                {canManage ? (
                  <Button size="sm" variant="outline" onClick={() => openEdit(sport)}>
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
            <DialogTitle>{editing ? 'Edit sport' : 'Add sport'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
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
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as ClubActivityType)}>
                <option value="CLUB">Club</option>
                <option value="SOCIETY">Society</option>
                <option value="ACTIVITY">Activity</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
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
          <div className="space-y-2">
            <Label>House name</Label>
            <Input value={houseName} onChange={(e) => setHouseName(e.target.value)} />
          </div>
          <Button loading={saving} onClick={() => void saveHouse()}>
            Add house
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
