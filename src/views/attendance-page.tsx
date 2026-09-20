import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { catalogService, studentService } from '@/services/api'
import { runMockProcess } from '@/lib/notify'
import { fullName } from '@/lib/utils'
import type { AttendanceStatus, SchoolClass, Stream, Student, Subject } from '@/types'

const statuses: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']

export function AttendancePage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [date, setDate] = useState('2026-09-15')
  const [classId, setClassId] = useState('cls-f3')
  const [streamId, setStreamId] = useState('str-3a')
  const [subjectId, setSubjectId] = useState('sub-math')
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      studentService.list(),
      catalogService.getClasses(),
      catalogService.getStreams(),
      catalogService.getSubjects(),
      catalogService.getAttendance(),
    ]).then(([stu, c, st, sub, att]) => {
      setStudents(stu)
      setClasses(c)
      setStreams(st)
      setSubjects(sub)
      const seed: Record<string, AttendanceStatus> = {}
      att.forEach((a) => {
        if (a.date === date) seed[a.studentId] = a.status
      })
      setMarks(seed)
      setLoading(false)
    })
  }, [date])

  const roster = useMemo(
    () =>
      students.filter(
        (s) => s.classId === classId && s.streamId === streamId && s.status === 'ACTIVE',
      ),
    [students, classId, streamId],
  )

  const stats = useMemo(() => {
    const values = roster.map((s) => marks[s.id] ?? 'PRESENT')
    const total = values.length || 1
    const present = values.filter((v) => v === 'PRESENT' || v === 'LATE').length
    return {
      present,
      absent: values.filter((v) => v === 'ABSENT').length,
      late: values.filter((v) => v === 'LATE').length,
      excused: values.filter((v) => v === 'EXCUSED').length,
      pct: Math.round((present / total) * 100),
    }
  }, [roster, marks])

  if (loading) return <LoadingState message="Loading attendance roster…" />

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Record and review class attendance."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Attendance' }]}
        actions={
          <Button
            loading={saving}
            onClick={() => {
              void (async () => {
                setSaving(true)
                try {
                  await runMockProcess({
                    loading: 'Saving attendance session…',
                    success: 'Attendance session saved',
                    error: 'Could not save attendance',
                  })
                } finally {
                  setSaving(false)
                }
              })()
            }}
          >
            Save session
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attendance %</p>
            <p className="font-display text-2xl font-semibold">{stats.pct}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Present</p>
            <p className="font-display text-2xl font-semibold">{stats.present}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Late</p>
            <p className="font-display text-2xl font-semibold">{stats.late}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Absent / Excused</p>
            <p className="font-display text-2xl font-semibold">
              {stats.absent} / {stats.excused}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value)
              const first = streams.find((s) => s.classId === e.target.value)
              if (first) setStreamId(first.id)
            }}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={streamId} onChange={(e) => setStreamId(e.target.value)}>
            {streams
              .filter((s) => s.classId === classId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {roster.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{fullName(s)}</p>
                <p className="text-xs text-muted-foreground">{s.studentNumber}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={(marks[s.id] ?? 'PRESENT') === status ? 'default' : 'outline'}
                    onClick={() => setMarks((prev) => ({ ...prev, [s.id]: status }))}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Attendance history (sample)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {roster.slice(0, 3).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span>{fullName(s)}</span>
              <StatusBadge status={marks[s.id] ?? 'PRESENT'} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
