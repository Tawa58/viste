import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { catalogService, studentService } from '@/services/api'
import type { AcademicYear, SchoolClass, Staff, Stream, Student, Subject, Term } from '@/types'

export function ClassesPage() {
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      catalogService.getClasses(),
      catalogService.getStreams(),
      catalogService.getStaff(),
      studentService.list(),
      catalogService.getYears(),
      catalogService.getTerms(),
    ]).then(([c, st, sf, stu, y, t]) => {
      setClasses(c)
      setStreams(st)
      setStaff(sf)
      setStudents(stu)
      setYears(y)
      setTerms(t)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Classes & Streams"
        description="Manage academic structure for the current year."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Classes' }]}
        actions={<Button onClick={() => setOpen(true)}>Manage class</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {years.map((y) => (
          <Badge key={y.id} variant={y.isCurrent ? 'default' : 'secondary'}>
            {y.name}
            {y.isCurrent ? ' · Current' : ''}
          </Badge>
        ))}
        {terms
          .filter((t) => t.academicYearId === 'ay-2025')
          .map((t) => (
            <Badge key={t.id} variant="outline">
              {t.name}
            </Badge>
          ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {classes.map((cls) => {
          const teacher = staff.find((s) => s.id === cls.classTeacherId)
          const classStreams = streams.filter((s) => s.classId === cls.id)
          const count = students.filter((s) => s.classId === cls.id && s.status === 'ACTIVE').length
          return (
            <Card key={cls.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>{cls.name}</span>
                  <Badge variant="secondary">{count} students</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Class teacher:{' '}
                  {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {classStreams.map((s) => (
                    <Badge key={s.id} variant="outline">
                      {s.name} · cap {s.capacity}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Class / stream form</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Class name</Label>
              <Input placeholder="Form 3" />
            </div>
            <div className="space-y-2">
              <Label>Stream</Label>
              <Input placeholder="3A" />
            </div>
          </div>
          <Button onClick={() => setOpen(false)}>Save mock</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function SubjectsPage() {
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    catalogService.getSubjects().then((s) => {
      setSubjects(s)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState />

  return (
    <div>
      <PageHeader
        title="Subjects"
        description="Curriculum subject catalogue."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Subjects' }]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-5">
              <p className="font-display text-lg font-semibold">{s.name}</p>
              <p className="text-sm text-muted-foreground">
                {s.code} · {s.category}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
