import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { notify } from '@/lib/notify'
import { fullName } from '@/lib/utils'
import { classService } from '@/services/api'
import type { DutyDay, DutyRosterEntry, Student } from '@/types'

const DUTY_DAYS: { day: DutyDay; label: string }[] = [
  { day: 'MON', label: 'Monday' },
  { day: 'TUE', label: 'Tuesday' },
  { day: 'WED', label: 'Wednesday' },
  { day: 'THU', label: 'Thursday' },
  { day: 'FRI', label: 'Friday' },
]

function emptyEntries(): DutyRosterEntry[] {
  return DUTY_DAYS.map((d) => ({ day: d.day, duty: '', assigneeName: '' }))
}

function currentWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function ClassDutyRosterDialog({
  classId,
  className,
  students,
  open,
  onOpenChange,
}: {
  classId: string
  className: string
  students: Student[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [weekOf, setWeekOf] = useState(currentWeekStart())
  const [entries, setEntries] = useState<DutyRosterEntry[]>(emptyEntries)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !weekOf) return
    let cancelled = false
    setLoading(true)
    void classService
      .getDutyRoster?.(classId, weekOf)
      .then((roster) => {
        if (cancelled) return
        setEntries(
          DUTY_DAYS.map(
            (d) =>
              roster?.entries?.find((e) => e.day === d.day) ?? {
                day: d.day,
                duty: '',
                assigneeName: '',
              },
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setEntries(emptyEntries())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [classId, weekOf, open])

  function update(index: number, patch: Partial<DutyRosterEntry>) {
    setEntries((prev) => prev.map((x, i) => (i === index ? { ...x, ...patch } : x)))
  }

  async function save() {
    if (!classService.saveDutyRoster) return
    setSaving(true)
    try {
      await notify.process(
        () =>
          classService.saveDutyRoster!(classId, {
            weekOf,
            entries: entries.filter((e) => e.duty.trim()),
          }),
        { loading: 'Saving duty roster…', success: 'Duty roster saved' },
      )
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,720px)] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)]">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>Duty roster · {className}</DialogTitle>
          <DialogDescription>
            Weekly classroom duties for this class (monitors, cleaners, etc.).
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <div className="max-w-xs space-y-1.5">
            <Label>Week starting</Label>
            <Input type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Day</th>
                  <th className="px-3 py-2">Duty</th>
                  <th className="px-3 py-2">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {DUTY_DAYS.map((d, i) => {
                  const row = entries[i] ?? { day: d.day, duty: '', assigneeName: '' }
                  return (
                    <tr key={d.day} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{d.label}</td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.duty}
                          disabled={loading}
                          placeholder="e.g. Class monitor"
                          onChange={(e) => update(i, { duty: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.assigneeName ?? ''}
                          disabled={loading}
                          list="duty-roster-students"
                          placeholder="Student name"
                          onChange={(e) => update(i, { assigneeName: e.target.value })}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <datalist id="duty-roster-students">
            {students.map((s) => (
              <option key={s.id} value={fullName(s)} />
            ))}
          </datalist>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button loading={saving} disabled={loading} onClick={() => void save()}>
            Save duty roster
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
