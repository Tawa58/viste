import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { educationLevelName, resolveEducationLevelId } from '@/lib/education-levels'
import { cn } from '@/lib/utils'
import type {
  ClubActivity,
  Guardian,
  House,
  SchoolClass,
  Sport,
  Stream,
  Student,
  StudentStatus,
  Subject,
} from '@/types'

export type NewGuardianDraft = {
  firstName: string
  lastName: string
  relationship: string
  phone: string
  email: string
  address: string
  occupation: string
  emergencyContact: boolean
}

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
  educationLevelId: string
  academicYearId: string
  termId: string
  subjectIds: string[]
  sportIds: string[]
  clubIds: string[]
  houseId: string
  guardianIds: string[]
  newGuardian: NewGuardianDraft | null
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
    educationLevelId: student?.educationLevelId ?? '',
    academicYearId: student?.academicYearId ?? '',
    termId: student?.termId ?? '',
    subjectIds: student?.subjectIds ? [...student.subjectIds] : [],
    sportIds: student?.sportIds ? [...student.sportIds] : [],
    clubIds: student?.clubIds ? [...student.clubIds] : [],
    houseId: student?.houseId ?? '',
    guardianIds: student?.guardianIds ? [...student.guardianIds] : [],
    newGuardian: null,
  }
}

export function emptyNewGuardian(): NewGuardianDraft {
  return {
    firstName: '',
    lastName: '',
    relationship: 'Parent',
    phone: '',
    email: '',
    address: '',
    occupation: '',
    emergencyContact: true,
  }
}

export function StudentEditorForm({
  mode,
  values,
  onChange,
  classes,
  streams,
  subjects,
  sports = [],
  clubs = [],
  houses = [],
  guardians,
  fullAccess,
  numberPreview,
  className,
}: {
  mode: 'create' | 'edit'
  values: StudentFormValues
  onChange: (next: StudentFormValues) => void
  classes: SchoolClass[]
  streams: Stream[]
  subjects: Subject[]
  sports?: Sport[]
  clubs?: ClubActivity[]
  houses?: House[]
  guardians: Guardian[]
  /** Admin/registrar: full fields. Teacher: phone + address only. */
  fullAccess: boolean
  /** Preview of auto-assigned VHS number on create. */
  numberPreview?: string
  className?: string
}) {
  const classStreams = useMemo(
    () => streams.filter((s) => s.classId === values.classId),
    [streams, values.classId],
  )

  const selectedClass = classes.find((c) => c.id === values.classId)
  const levelId =
    values.educationLevelId ||
    selectedClass?.educationLevelId ||
    resolveEducationLevelId(selectedClass?.level) ||
    ''

  const filteredSubjects = useMemo(() => {
    const active = subjects.filter((s) => s.active !== false)
    if (!levelId) return active
    return active.filter(
      (s) => !s.educationLevelIds?.length || s.educationLevelIds.includes(levelId),
    )
  }, [subjects, levelId])

  function setField<K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function toggleId(key: 'subjectIds' | 'sportIds' | 'clubIds' | 'guardianIds', id: string) {
    const current = values[key]
    setField(
      key,
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
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
              placeholder="+263 …"
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

  const activeClasses = useMemo(() => {
    const open = classes.filter((c) => (c.status ?? 'ACTIVE') !== 'ARCHIVED')
    return open.length > 0 ? open : classes
  }, [classes])

  return (
    <div className={cn('space-y-5', className)}>
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Personal information
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
              <option value="SUSPENDED">Suspended</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="GRADUATED">Graduated</option>
              <option value="ARCHIVED">Archived</option>
              <option value="INACTIVE">Inactive</option>
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
          Academic information
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="student-class">Class</Label>
            <Select
              id="student-class"
              value={values.classId}
              onChange={(e) => {
                const classId = e.target.value
                const cls = classes.find((c) => c.id === classId)
                const firstStream = streams.find((s) => s.classId === classId)
                const nextLevel =
                  cls?.educationLevelId || resolveEducationLevelId(cls?.level) || ''
                onChange({
                  ...values,
                  classId,
                  streamId: firstStream?.id ?? '',
                  educationLevelId: nextLevel,
                  academicYearId: cls?.academicYearId ?? values.academicYearId,
                  termId: cls?.termId ?? values.termId,
                  // Prefer the class curriculum; fall back to level-compatible selection
                  subjectIds:
                    cls?.subjectIds && cls.subjectIds.length > 0
                      ? [...cls.subjectIds]
                      : values.subjectIds.filter((id) => {
                          const sub = subjects.find((s) => s.id === id)
                          if (!sub?.educationLevelIds?.length) return true
                          return !nextLevel || sub.educationLevelIds.includes(nextLevel)
                        }),
                })
              }}
              required
            >
              <option value="">Select class</option>
              {activeClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {educationLevelName(c.educationLevelId) || c.level}
                </option>
              ))}
            </Select>
            {activeClasses.length === 0 ? (
              <p className="text-xs text-destructive">
                No active classes found. Create a class under Classes before registering students.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Required. Choosing a class sets the education level and filters subjects.
              </p>
            )}
          </div>

          {levelId ? (
            <div className="space-y-2">
              <Label>Education level</Label>
              <Input value={educationLevelName(levelId)} disabled />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Admission date</Label>
            <Input
              type="date"
              value={values.admissionDate}
              onChange={(e) => setField('admissionDate', e.target.value)}
            />
          </div>

          {mode === 'create' ? (
            <div className="space-y-2 sm:col-span-2">
              <Label>Student / admission number</Label>
              <Input
                value={numberPreview || 'VHS-YYYY-001'}
                disabled
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Assigned automatically as <span className="font-mono">VHS-{'{year}'}-001</span> based
                on admission year. Same value is used for student number and admission number.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Admission number</Label>
                <Input
                  value={values.admissionNumber}
                  onChange={(e) => setField('admissionNumber', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Student number</Label>
                <Input
                  value={values.studentNumber}
                  onChange={(e) => setField('studentNumber', e.target.value)}
                  className="font-mono"
                />
              </div>
            </>
          )}

          {classStreams.length > 1 ? (
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
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Subjects
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Filtered for {levelId ? educationLevelName(levelId) : 'the selected class'}.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              No subjects configured for this level. Add subjects under Subjects management.
            </p>
          ) : (
            filteredSubjects.map((subject) => {
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
                    onCheckedChange={() => toggleId('subjectIds', subject.id)}
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
            })
          )}
        </div>
      </section>

      {(sports.length > 0 || clubs.length > 0 || houses.length > 0) && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Sports, clubs & house
          </p>
          {sports.filter((s) => s.active).length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {sports
                .filter((s) => s.active)
                .map((sport) => {
                  const checked = values.sportIds.includes(sport.id)
                  return (
                    <label
                      key={sport.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm',
                        checked ? 'border-accent/40 bg-accent/5' : 'border-border/70',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleId('sportIds', sport.id)}
                      />
                      {sport.name}
                    </label>
                  )
                })}
            </div>
          ) : null}
          {clubs.filter((c) => c.active).length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {clubs
                .filter((c) => c.active)
                .map((club) => {
                  const checked = values.clubIds.includes(club.id)
                  return (
                    <label
                      key={club.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm',
                        checked ? 'border-primary/30 bg-primary/5' : 'border-border/70',
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleId('clubIds', club.id)}
                      />
                      {club.name}
                      <span className="text-xs text-muted-foreground">({club.type})</span>
                    </label>
                  )
                })}
            </div>
          ) : null}
          {houses.filter((h) => h.active).length > 0 ? (
            <div className="space-y-2">
              <Label>House</Label>
              <Select
                value={values.houseId}
                onChange={(e) => setField('houseId', e.target.value)}
              >
                <option value="">None</option>
                {houses
                  .filter((h) => h.active)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </Select>
            </div>
          ) : null}
        </section>
      )}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Parents / guardians
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Link existing guardians or add one during registration.
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
                  onCheckedChange={() => toggleId('guardianIds', g.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">
                    {g.firstName} {g.lastName}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {g.relationship} · {g.phone}
                    {g.email ? ` · ${g.email}` : ''}
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        {mode === 'create' ? (
          values.newGuardian ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">New guardian</p>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setField('newGuardian', null)}
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="First name"
                  value={values.newGuardian.firstName}
                  onChange={(e) =>
                    setField('newGuardian', {
                      ...values.newGuardian!,
                      firstName: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Last name"
                  value={values.newGuardian.lastName}
                  onChange={(e) =>
                    setField('newGuardian', {
                      ...values.newGuardian!,
                      lastName: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Relationship"
                  value={values.newGuardian.relationship}
                  onChange={(e) =>
                    setField('newGuardian', {
                      ...values.newGuardian!,
                      relationship: e.target.value,
                    })
                  }
                />
                <Input
                  placeholder="Phone"
                  value={values.newGuardian.phone}
                  onChange={(e) =>
                    setField('newGuardian', { ...values.newGuardian!, phone: e.target.value })
                  }
                />
                <Input
                  placeholder="Email"
                  value={values.newGuardian.email}
                  onChange={(e) =>
                    setField('newGuardian', { ...values.newGuardian!, email: e.target.value })
                  }
                />
                <Input
                  placeholder="Address"
                  value={values.newGuardian.address}
                  onChange={(e) =>
                    setField('newGuardian', {
                      ...values.newGuardian!,
                      address: e.target.value,
                    })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={values.newGuardian.emergencyContact}
                  onCheckedChange={(v) =>
                    setField('newGuardian', {
                      ...values.newGuardian!,
                      emergencyContact: v === true,
                    })
                  }
                />
                Emergency contact
              </label>
            </div>
          ) : (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => setField('newGuardian', emptyNewGuardian())}
            >
              + Add a new parent / guardian
            </button>
          )
        ) : null}
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
  emergencyContact?: boolean
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
    emergencyContact: guardian?.emergencyContact ?? false,
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
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox
          checked={values.emergencyContact === true}
          onCheckedChange={(v) => setField('emergencyContact', v === true)}
        />
        Emergency contact
      </label>
    </div>
  )
}
