import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Guardian, SchoolClass, Stream, Student, StudentStatus, Subject } from '@/types'

export type StudentFormValues = {
  firstName: string
  middleName: string
  lastName: string
  dateOfBirth: string
  gender: 'Male' | 'Female'
  email: string
  phone: string
  address: string
  admissionNumber: string
  studentNumber: string
  admissionDate: string
  status: StudentStatus
  classId: string
  streamId: string
  subjectIds: string[]
  guardianIds: string[]
}

export function studentToFormValues(student?: Student | null): StudentFormValues {
  return {
    firstName: student?.firstName ?? '',
    middleName: student?.middleName ?? '',
    lastName: student?.lastName ?? '',
    dateOfBirth: student?.dateOfBirth ?? '2010-01-01',
    gender: student?.gender ?? 'Male',
    email: student?.email ?? '',
    phone: student?.phone ?? '',
    address: student?.address ?? '',
    admissionNumber: student?.admissionNumber ?? '',
    studentNumber: student?.studentNumber ?? '',
    admissionDate: student?.admissionDate ?? new Date().toISOString().slice(0, 10),
    status: student?.status ?? 'ACTIVE',
    classId: student?.classId ?? '',
    streamId: student?.streamId ?? '',
    subjectIds: student?.subjectIds ? [...student.subjectIds] : [],
    guardianIds: student?.guardianIds ? [...student.guardianIds] : [],
  }
}

export function StudentEditorForm({
  mode,
  values,
  onChange,
  classes,
  streams,
  subjects,
  guardians,
  fullAccess,
  className,
}: {
  mode: 'create' | 'edit'
  values: StudentFormValues
  onChange: (next: StudentFormValues) => void
  classes: SchoolClass[]
  streams: Stream[]
  subjects: Subject[]
  guardians: Guardian[]
  /** Admin/registrar: full fields. Teacher: phone + address only. */
  fullAccess: boolean
  className?: string
}) {
  const classStreams = useMemo(
    () => streams.filter((s) => s.classId === values.classId),
    [streams, values.classId],
  )

  function setField<K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function toggleSubject(id: string) {
    setField(
      'subjectIds',
      values.subjectIds.includes(id)
        ? values.subjectIds.filter((x) => x !== id)
        : [...values.subjectIds, id],
    )
  }

  function toggleGuardian(id: string) {
    setField(
      'guardianIds',
      values.guardianIds.includes(id)
        ? values.guardianIds.filter((x) => x !== id)
        : [...values.guardianIds, id],
    )
  }

  if (!fullAccess) {
    return (
      <div className={cn('space-y-4', className)}>
        <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Teachers can update contact details only. Registration, subjects, status, and guardians are
          managed by school admin.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={values.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="+1 …"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea
              value={values.address}
              onChange={(e) => setField('address', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Profile
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>First name</Label>
            <Input
              value={values.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Last name</Label>
            <Input
              value={values.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Middle name</Label>
            <Input
              value={values.middleName}
              onChange={(e) => setField('middleName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={values.gender}
              onChange={(e) => setField('gender', e.target.value as 'Male' | 'Female')}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date of birth</Label>
            <Input
              type="date"
              value={values.dateOfBirth}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={values.status}
              onChange={(e) => setField('status', e.target.value as StudentStatus)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="GRADUATED">Graduated</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={values.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address</Label>
            <Textarea
              value={values.address}
              onChange={(e) => setField('address', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Enrolment
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Student number</Label>
            <Input
              value={values.studentNumber}
              onChange={(e) => setField('studentNumber', e.target.value)}
              placeholder={mode === 'create' ? 'Auto if left blank' : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label>Admission number</Label>
            <Input
              value={values.admissionNumber}
              onChange={(e) => setField('admissionNumber', e.target.value)}
              placeholder={mode === 'create' ? 'Auto if left blank' : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label>Admission date</Label>
            <Input
              type="date"
              value={values.admissionDate}
              onChange={(e) => setField('admissionDate', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={values.classId}
              onChange={(e) => {
                const classId = e.target.value
                const firstStream = streams.find((s) => s.classId === classId)
                onChange({
                  ...values,
                  classId,
                  streamId: firstStream?.id ?? '',
                })
              }}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Stream</Label>
            <Select
              value={values.streamId}
              onChange={(e) => setField('streamId', e.target.value)}
              disabled={!values.classId}
            >
              <option value="">Select stream</option>
              {classStreams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Subjects
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Select the subjects this student is registered for.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {subjects.map((subject) => {
            const checked = values.subjectIds.includes(subject.id)
            return (
              <label
                key={subject.id}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition',
                  checked ? 'border-accent/40 bg-accent/5' : 'border-border/70 bg-card',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleSubject(subject.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{subject.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {subject.code} · {subject.category}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Guardians
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Link one or more guardians. Edit guardian contact details from the student profile.
          </p>
        </div>
        <div className="grid gap-2">
          {guardians.map((g) => {
            const checked = values.guardianIds.includes(g.id)
            return (
              <label
                key={g.id}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition',
                  checked ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-card',
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleGuardian(g.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">
                    {g.firstName} {g.lastName}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {g.relationship} · {g.phone} · {g.email}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export type GuardianFormValues = {
  firstName: string
  lastName: string
  relationship: string
  email: string
  phone: string
  address: string
  occupation: string
}

export function guardianToFormValues(guardian?: Guardian | null): GuardianFormValues {
  return {
    firstName: guardian?.firstName ?? '',
    lastName: guardian?.lastName ?? '',
    relationship: guardian?.relationship ?? 'Parent',
    email: guardian?.email ?? '',
    phone: guardian?.phone ?? '',
    address: guardian?.address ?? '',
    occupation: guardian?.occupation ?? '',
  }
}

export function GuardianEditorForm({
  values,
  onChange,
  className,
}: {
  values: GuardianFormValues
  onChange: (next: GuardianFormValues) => void
  className?: string
}) {
  function setField<K extends keyof GuardianFormValues>(key: K, value: GuardianFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <div className="space-y-2">
        <Label>First name</Label>
        <Input value={values.firstName} onChange={(e) => setField('firstName', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Last name</Label>
        <Input value={values.lastName} onChange={(e) => setField('lastName', e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Relationship</Label>
        <Input
          value={values.relationship}
          onChange={(e) => setField('relationship', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Occupation</Label>
        <Input
          value={values.occupation}
          onChange={(e) => setField('occupation', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={values.email}
          onChange={(e) => setField('email', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input value={values.phone} onChange={(e) => setField('phone', e.target.value)} />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Address</Label>
        <Textarea
          value={values.address}
          onChange={(e) => setField('address', e.target.value)}
          rows={2}
        />
      </div>
    </div>
  )
}
