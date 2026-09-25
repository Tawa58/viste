import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { generateClassTeacherComment } from '@/lib/class-teacher-comment'
import { notify } from '@/lib/notify'
import { fullName } from '@/lib/utils'
import { classService } from '@/services/api'
import type {
  ClassResultsPeriod,
  ClassResultsStudentRow,
  ClassResultsSummary,
  Student,
  Term,
} from '@/types'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function averageVariant(avg: number | null) {
  if (avg === null) return 'outline' as const
  if (avg >= 70) return 'success' as const
  if (avg >= 50) return 'secondary' as const
  if (avg >= 40) return 'warning' as const
  return 'danger' as const
}

export function ClassReportCommentsDialog({
  classId,
  className,
  students,
  terms,
  defaultTermId,
  open,
  onOpenChange,
}: {
  classId: string
  className: string
  students: Student[]
  terms: Term[]
  defaultTermId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [termId, setTermId] = useState(defaultTermId)
  const [period, setPeriod] = useState<ClassResultsPeriod>('TERM')
  const [month, setMonth] = useState(currentMonth())
  const [summary, setSummary] = useState<ClassResultsSummary | null>(null)
  const [resultsLoading, setResultsLoading] = useState(false)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!termId && defaultTermId) setTermId(defaultTermId)
  }, [defaultTermId, termId])

  useEffect(() => {
    if (!open || !termId) return
    let cancelled = false
    void classService
      .getTeacherReports?.(classId, termId)
      .catch(() => [])
      .then((rows) => {
        if (cancelled) return
        const next: Record<string, string> = {}
        for (const s of students) {
          next[s.id] = rows.find((r) => r.studentId === s.id)?.comment ?? ''
        }
        setComments(next)
        setDirty(false)
      })
    return () => {
      cancelled = true
    }
  }, [classId, termId, open, students])

  useEffect(() => {
    if (!open) return
    if (period === 'TERM' && !termId) return
    if (period === 'MONTH' && !month) return
    let cancelled = false
    setResultsLoading(true)
    void classService
      .getResultsSummary(classId, period === 'TERM' ? { period, termId } : { period, month })
      .then((res) => {
        if (!cancelled) setSummary(res)
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null)
          notify.error('Could not load class results')
        }
      })
      .finally(() => {
        if (!cancelled) setResultsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [classId, period, termId, month, open])

  const rowsByStudent = useMemo(() => {
    const map = new Map<string, ClassResultsStudentRow>()
    for (const r of summary?.students ?? []) map.set(r.studentId, r)
    return map
  }, [summary])

  const rankedCount = useMemo(
    () => (summary?.students ?? []).filter((r) => r.average !== null).length,
    [summary],
  )

  function setComment(studentId: string, value: string) {
    setComments((prev) => ({ ...prev, [studentId]: value }))
    setDirty(true)
  }

  function generateFor(student: Student) {
    const row = rowsByStudent.get(student.id)
    return generateClassTeacherComment({
      firstName: student.firstName,
      average: row?.average ?? null,
      subjects: row?.subjects ?? [],
      period,
      seed: student.id,
    })
  }

  function generateOne(student: Student) {
    const text = generateFor(student)
    if (!text) {
      notify.error(`No ${period === 'MONTH' ? 'month-end' : 'term'} results for ${fullName(student)} yet`)
      return
    }
    setComment(student.id, text)
  }

  function generateAllEmpty() {
    let filled = 0
    const next = { ...comments }
    for (const s of students) {
      if ((next[s.id] ?? '').trim()) continue
      const text = generateFor(s)
      if (!text) continue
      next[s.id] = text
      filled++
    }
    if (filled === 0) {
      notify.error('Nothing to generate', 'Every student already has a comment or has no results yet.')
      return
    }
    setComments(next)
    setDirty(true)
    notify.success(`Generated ${filled} comment${filled === 1 ? '' : 's'} — review before saving`)
  }

  function requestClose(next: boolean) {
    if (!next && dirty && !confirm('Discard unsaved report comments?')) return
    onOpenChange(next)
  }

  async function save() {
    if (!termId || !classService.saveTeacherReports) return
    const entries = students
      .map((s) => ({ studentId: s.id, comment: (comments[s.id] ?? '').trim() }))
      .filter((e) => e.comment.length > 0)
    if (entries.length === 0) {
      notify.error('Enter at least one class teacher comment')
      return
    }
    setSaving(true)
    try {
      await notify.process(
        () => classService.saveTeacherReports!(classId, { termId, entries }),
        { loading: 'Saving report comments…', success: 'Final report comments saved' },
      )
      setDirty(false)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const periodLabel = period === 'MONTH' ? 'Month-end' : 'Term'

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="flex max-h-[min(92dvh,860px)] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100%-2rem)]">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>Final report comments · {className}</DialogTitle>
          <DialogDescription>
            Review each student&apos;s results, then write a class teacher comment or generate one.
            Comments are saved to the selected term&apos;s final report.
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-border px-6 py-3">
          <div className="w-44 space-y-1.5">
            <Label>Term</Label>
            <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">Select term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44 space-y-1.5">
            <Label>Results</Label>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ClassResultsPeriod)}
            >
              <option value="TERM">Term results</option>
              <option value="MONTH">Month-end results</option>
            </Select>
          </div>
          {period === 'MONTH' ? (
            <div className="w-44 space-y-1.5">
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : null}
          <Button
            variant="outline"
            className="ml-auto"
            disabled={resultsLoading || students.length === 0}
            onClick={generateAllEmpty}
          >
            <Sparkles className="h-4 w-4" />
            Generate for empty
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No active students.</p>
          ) : (
            <div className="space-y-3">
              {!resultsLoading && summary && summary.subjects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  No {periodLabel.toLowerCase()} marks have been entered for this class yet. You can
                  still write comments manually.
                </p>
              ) : null}
              {students.map((s) => {
                const row = rowsByStudent.get(s.id)
                const avg = row?.average ?? null
                return (
                  <div
                    key={s.id}
                    className="grid gap-3 rounded-xl border border-border p-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={fullName(s)} className="h-8 w-8" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{fullName(s)}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.studentNumber || s.admissionNumber}
                          </p>
                        </div>
                      </div>
                      {resultsLoading ? (
                        <p className="text-xs text-muted-foreground">Loading results…</p>
                      ) : avg === null ? (
                        <p className="text-xs text-muted-foreground">
                          No {periodLabel.toLowerCase()} results yet
                        </p>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <Badge variant={averageVariant(avg)}>Average {avg}%</Badge>
                            {row?.grade ? <Badge variant="outline">Grade {row.grade}</Badge> : null}
                            {row?.position ? (
                              <Badge variant="outline">
                                Position {row.position}/{rankedCount}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {row!.subjects.map((sub) => (
                              <span
                                key={sub.subjectId}
                                className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {sub.subjectName} {Math.round(sub.percent)}% {sub.grade}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Textarea
                        rows={3}
                        value={comments[s.id] ?? ''}
                        onChange={(e) => setComment(s.id, e.target.value)}
                        placeholder="Class teacher comment…"
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={resultsLoading || avg === null}
                          onClick={() => generateOne(s)}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
          <Button variant="outline" onClick={() => requestClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!termId} onClick={() => void save()}>
            Save report comments
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
