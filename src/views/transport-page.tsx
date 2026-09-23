import { useEffect, useMemo, useState } from 'react'
import { Bus, MapPin, Plus, Users, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingState } from '@/components/shared/loading-state'
import { SearchInput } from '@/components/shared/search-input'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableShell,
} from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { catalogService, studentService } from '@/services/api'
import { notify } from '@/lib/notify'
import { formatCurrency, formatDate, fullName } from '@/lib/utils'
import type {
  Student,
  TransportPayment,
  TransportRider,
  TransportRoute,
  TransportStop,
  TransportVehicle,
} from '@/types'

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function RouteMap({ route }: { route: TransportRoute }) {
  const stops = [...(route.stops || [])].sort((a, b) => a.order - b.order)
  const width = 640
  const height = 160
  const pad = 48
  const n = Math.max(stops.length, 1)

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-gradient-to-b from-sky-50/80 to-background p-3 dark:from-sky-950/20">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full min-w-[420px]" role="img">
        <title>{route.name} pickup timeline</title>
        <path
          d={`M ${pad} ${height / 2} H ${width - pad}`}
          stroke="currentColor"
          strokeWidth="3"
          className="text-primary/40"
          fill="none"
          strokeDasharray="6 6"
        />
        {stops.map((s, i) => {
          const x = pad + (i / Math.max(n - 1, 1)) * (width - pad * 2)
          const y = height / 2
          const isSchool = /school/i.test(s.name)
          return (
            <g key={s.id || `${s.name}-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={isSchool ? 14 : 10}
                className={isSchool ? 'fill-primary' : 'fill-foreground'}
              />
              <text
                x={x}
                y={y - 22}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-semibold"
              >
                {s.name}
              </text>
              <text
                x={x}
                y={y + 28}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                ↑ {s.pickupTime}
              </text>
              <text
                x={x}
                y={y + 42}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                ↓ {s.dropTime}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Morning pickup (↑) and afternoon drop (↓) along {route.name}
      </p>
    </div>
  )
}

export function TransportPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('routes')
  const [routes, setRoutes] = useState<TransportRoute[]>([])
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([])
  const [riders, setRiders] = useState<TransportRider[]>([])
  const [payments, setPayments] = useState<TransportPayment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [search, setSearch] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const [routeOpen, setRouteOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [riderOpen, setRiderOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [routeForm, setRouteForm] = useState({
    name: '',
    vehicleId: '',
    driver: '',
    driverPhone: '',
    fee: 45,
    stopsText: 'Stop A|06:20|16:30\nSchool|07:00|15:50',
  })
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    registrationNumber: '',
    capacity: 40,
    type: 'BUS',
  })
  const [riderForm, setRiderForm] = useState({
    studentId: '',
    routeId: '',
    monthlyFee: '',
  })
  const [payForm, setPayForm] = useState({
    riderId: '',
    amount: '',
    month: currentMonth(),
    method: 'Cash',
    receiptNumber: '',
  })

  async function reload() {
    const [r, v, rd, p, stu] = await Promise.all([
      catalogService.getTransport(),
      catalogService.getTransportVehicles(),
      catalogService.getTransportRiders(),
      catalogService.getTransportPayments(),
      studentService.list().catch(() => [] as Student[]),
    ])
    setRoutes(r)
    setVehicles(v)
    setRiders(rd)
    setPayments(p)
    setStudents(stu.filter((s) => s.status === 'ACTIVE'))
    if (!selectedRouteId && r[0]) setSelectedRouteId(r[0].id)
  }

  useEffect(() => {
    reload()
      .catch((err) => {
        console.error(err)
        notify.error('Could not load transport')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const studentName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of students) map[s.id] = fullName(s)
    return map
  }, [students])

  const routeName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of routes) map[r.id] = r.name
    return map
  }, [routes])

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || routes[0]

  const billingRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return riders
      .filter((r) => r.status === 'ACTIVE')
      .map((r) => {
        const paid = payments
          .filter((p) => p.riderId === r.id && p.month === month)
          .reduce((s, p) => s + p.amount, 0)
        const due = r.monthlyFee
        const balance = Math.max(0, due - paid)
        return {
          rider: r,
          paid,
          due,
          balance,
          status: balance <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'DUE',
        }
      })
      .filter((row) => {
        if (!q) return true
        return `${studentName[row.rider.studentId] || ''} ${routeName[row.rider.routeId] || ''}`
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) =>
        (studentName[a.rider.studentId] || '').localeCompare(studentName[b.rider.studentId] || ''),
      )
  }, [riders, payments, month, search, studentName, routeName])

  const stats = useMemo(() => {
    const expected = billingRows.reduce((s, r) => s + r.due, 0)
    const collected = billingRows.reduce((s, r) => s + r.paid, 0)
    return {
      routes: routes.filter((r) => r.active !== false).length,
      fleet: vehicles.filter((v) => v.status === 'ACTIVE').length,
      riders: riders.filter((r) => r.status === 'ACTIVE').length,
      expected,
      collected,
      outstanding: Math.max(0, expected - collected),
    }
  }, [routes, vehicles, riders, billingRows])

  function parseStops(text: string): TransportStop[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        const [name, pickupTime, dropTime] = line.split('|').map((x) => x.trim())
        return {
          id: `stop-${i}`,
          name: name || `Stop ${i + 1}`,
          pickupTime: pickupTime || '06:30',
          dropTime: dropTime || '16:00',
          order: i,
        }
      })
  }

  async function saveRoute() {
    if (!routeForm.name.trim() || !routeForm.driver.trim()) {
      notify.error('Route name and driver are required')
      return
    }
    setSaving(true)
    try {
      await catalogService.createTransportRoute({
        name: routeForm.name.trim(),
        vehicleId: routeForm.vehicleId || undefined,
        driver: routeForm.driver.trim(),
        driverPhone: routeForm.driverPhone.trim(),
        fee: Number(routeForm.fee) || 0,
        stops: parseStops(routeForm.stopsText),
        active: true,
      })
      notify.success('Route created')
      setRouteOpen(false)
      await reload()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save route')
    } finally {
      setSaving(false)
    }
  }

  async function saveVehicle() {
    if (!vehicleForm.name.trim() || !vehicleForm.registrationNumber.trim()) {
      notify.error('Vehicle name and registration are required')
      return
    }
    setSaving(true)
    try {
      await catalogService.createTransportVehicle({
        name: vehicleForm.name.trim(),
        registrationNumber: vehicleForm.registrationNumber.trim(),
        capacity: Number(vehicleForm.capacity) || 30,
        type: vehicleForm.type,
        status: 'ACTIVE',
      })
      notify.success('Vehicle added to fleet')
      setVehicleOpen(false)
      await reload()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not save vehicle')
    } finally {
      setSaving(false)
    }
  }

  async function saveRider() {
    if (!riderForm.studentId || !riderForm.routeId) {
      notify.error('Select student and route')
      return
    }
    setSaving(true)
    try {
      await catalogService.createTransportRider({
        studentId: riderForm.studentId,
        routeId: riderForm.routeId,
        monthlyFee: riderForm.monthlyFee ? Number(riderForm.monthlyFee) : undefined,
      })
      notify.success('Student enrolled on route')
      setRiderOpen(false)
      await reload()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not enrol rider')
    } finally {
      setSaving(false)
    }
  }

  async function savePayment() {
    if (!payForm.riderId || !payForm.amount) {
      notify.error('Select rider and amount')
      return
    }
    setSaving(true)
    try {
      await catalogService.createTransportPayment({
        riderId: payForm.riderId,
        amount: Number(payForm.amount),
        month: payForm.month,
        method: payForm.method,
        receiptNumber: payForm.receiptNumber,
      })
      notify.success('Payment recorded')
      setPayOpen(false)
      await reload()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Could not record payment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading transport…" />

  return (
    <div>
      <PageHeader
        title="Transport"
        description="Fleet, routes with pickup/drop times, riders, and monthly fee tracking."
        breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Transport' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setVehicleOpen(true)}>
              <Plus className="h-4 w-4" />
              Vehicle
            </Button>
            <Button type="button" variant="outline" onClick={() => setRouteOpen(true)}>
              <Plus className="h-4 w-4" />
              Route
            </Button>
            <Button type="button" onClick={() => setRiderOpen(true)}>
              <Plus className="h-4 w-4" />
              Enrol rider
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active routes" value={String(stats.routes)} icon={MapPin} compact />
        <StatCard label="Fleet vehicles" value={String(stats.fleet)} icon={Bus} compact />
        <StatCard label="Riders" value={String(stats.riders)} icon={Users} compact />
        <StatCard
          label={`${month} collected`}
          value={formatCurrency(stats.collected)}
          hint={`Due ${formatCurrency(stats.expected)} · Outstanding ${formatCurrency(stats.outstanding)}`}
          icon={Wallet}
          tone="accent"
          compact
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="routes">Routes & map</TabsTrigger>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="billing">Riders & payments</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {routes.map((r) => (
              <Button
                key={r.id}
                type="button"
                size="sm"
                variant={selectedRoute?.id === r.id ? 'default' : 'outline'}
                onClick={() => setSelectedRouteId(r.id)}
              >
                {r.name}
              </Button>
            ))}
          </div>

          {selectedRoute ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedRoute.name}</CardTitle>
                <CardDescription>
                  {selectedRoute.vehicle || 'No vehicle'} · Driver {selectedRoute.driver}
                  {selectedRoute.driverPhone ? ` · ${selectedRoute.driverPhone}` : ''} ·{' '}
                  {formatCurrency(selectedRoute.fee)}/month
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RouteMap route={selectedRoute} />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(selectedRoute.stops || []).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Pickup {s.pickupTime} · Drop {s.dropTime}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {riders.filter((x) => x.routeId === selectedRoute.id && x.status === 'ACTIVE').length}{' '}
                  active riders on this route
                </p>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">No routes yet. Create one to begin.</p>
          )}
        </TabsContent>

        <TabsContent value="fleet" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((v) => (
              <Card key={v.id}>
                <CardContent className="space-y-1 p-5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-lg font-semibold">{v.name}</p>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="font-medium">{v.registrationNumber}</p>
                  <p className="text-muted-foreground">
                    {v.type} · Capacity {v.capacity}
                  </p>
                </CardContent>
              </Card>
            ))}
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fleet vehicles registered.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="billing" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Field>
              <Label>Billing month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </Field>
            <SearchInput
              id="transport-search"
              name="transport-search"
              value={search}
              onChange={setSearch}
              placeholder="Search rider or route…"
              className="min-w-[200px] flex-1"
            />
            <Button
              type="button"
              onClick={() => {
                setPayForm((f) => ({ ...f, month }))
                setPayOpen(true)
              }}
            >
              Record payment
            </Button>
          </div>

          {billingRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              No active riders. Enrol students on a route to track monthly fees.
            </p>
          ) : (
            <DataTableShell>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Student</DataTableHeaderCell>
                    <DataTableHeaderCell>Route</DataTableHeaderCell>
                    <DataTableHeaderCell>Monthly fee</DataTableHeaderCell>
                    <DataTableHeaderCell>Paid ({month})</DataTableHeaderCell>
                    <DataTableHeaderCell>Balance</DataTableHeaderCell>
                    <DataTableHeaderCell>Status</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {billingRows.map((row) => (
                    <DataTableRow key={row.rider.id}>
                      <DataTableCell className="font-medium">
                        {studentName[row.rider.studentId] || row.rider.studentId}
                      </DataTableCell>
                      <DataTableCell>
                        {routeName[row.rider.routeId] || row.rider.routeId}
                      </DataTableCell>
                      <DataTableCell>{formatCurrency(row.due)}</DataTableCell>
                      <DataTableCell>{formatCurrency(row.paid)}</DataTableCell>
                      <DataTableCell>{formatCurrency(row.balance)}</DataTableCell>
                      <DataTableCell>
                        <StatusBadge status={row.status} />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </DataTableShell>
          )}

          {payments.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Recent payments</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {payments.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    {formatDate(p.paidAt)} · {studentName[p.studentId] || p.studentId} ·{' '}
                    {formatCurrency(p.amount)} for {p.month} ({p.method})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New transport route</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label>Route name</Label>
              <Input
                value={routeForm.name}
                onChange={(e) => setRouteForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Vehicle</Label>
              <Select
                value={routeForm.vehicleId}
                onChange={(e) => setRouteForm((f) => ({ ...f, vehicleId: e.target.value }))}
              >
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.registrationNumber})
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Monthly fee</Label>
              <Input
                type="number"
                min={0}
                value={routeForm.fee}
                onChange={(e) => setRouteForm((f) => ({ ...f, fee: Number(e.target.value) }))}
              />
            </Field>
            <Field>
              <Label>Driver name</Label>
              <Input
                value={routeForm.driver}
                onChange={(e) => setRouteForm((f) => ({ ...f, driver: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Driver phone</Label>
              <Input
                value={routeForm.driverPhone}
                onChange={(e) => setRouteForm((f) => ({ ...f, driverPhone: e.target.value }))}
              />
            </Field>
            <Field className="sm:col-span-2">
              <Label>Stops (one per line: Name|pickup|drop)</Label>
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={routeForm.stopsText}
                onChange={(e) => setRouteForm((f) => ({ ...f, stopsText: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRouteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={() => void saveRoute()}>
              Save route
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add fleet vehicle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={vehicleForm.name}
                onChange={(e) => setVehicleForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Registration number</Label>
              <Input
                value={vehicleForm.registrationNumber}
                onChange={(e) =>
                  setVehicleForm((f) => ({ ...f, registrationNumber: e.target.value }))
                }
              />
            </Field>
            <Field>
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                value={vehicleForm.capacity}
                onChange={(e) =>
                  setVehicleForm((f) => ({ ...f, capacity: Number(e.target.value) }))
                }
              />
            </Field>
            <Field>
              <Label>Type</Label>
              <Select
                value={vehicleForm.type}
                onChange={(e) => setVehicleForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="BUS">Bus</option>
                <option value="MINIBUS">Minibus</option>
                <option value="VAN">Van</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setVehicleOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={() => void saveVehicle()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={riderOpen} onOpenChange={setRiderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enrol transport rider</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field>
              <Label>Student</Label>
              <Select
                value={riderForm.studentId}
                onChange={(e) => setRiderForm((f) => ({ ...f, studentId: e.target.value }))}
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fullName(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Route</Label>
              <Select
                value={riderForm.routeId}
                onChange={(e) => {
                  const route = routes.find((r) => r.id === e.target.value)
                  setRiderForm((f) => ({
                    ...f,
                    routeId: e.target.value,
                    monthlyFee: route ? String(route.fee) : f.monthlyFee,
                  }))
                }}
              >
                <option value="">Select route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({formatCurrency(r.fee)}/mo)
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label>Monthly fee (optional override)</Label>
              <Input
                type="number"
                min={0}
                value={riderForm.monthlyFee}
                onChange={(e) => setRiderForm((f) => ({ ...f, monthlyFee: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRiderOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={() => void saveRider()}>
              Enrol
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record transport payment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label>Rider</Label>
              <Select
                value={payForm.riderId}
                onChange={(e) => {
                  const rider = riders.find((r) => r.id === e.target.value)
                  setPayForm((f) => ({
                    ...f,
                    riderId: e.target.value,
                    amount: rider ? String(rider.monthlyFee) : f.amount,
                  }))
                }}
              >
                <option value="">Select rider</option>
                {riders
                  .filter((r) => r.status === 'ACTIVE')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {studentName[r.studentId] || r.studentId} —{' '}
                      {routeName[r.routeId] || r.routeId}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field>
              <Label>Month</Label>
              <Input
                type="month"
                value={payForm.month}
                onChange={(e) => setPayForm((f) => ({ ...f, month: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </Field>
            <Field>
              <Label>Method</Label>
              <Select
                value={payForm.method}
                onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
              >
                <option>Cash</option>
                <option>EcoCash</option>
                <option>Bank transfer</option>
                <option>Card</option>
              </Select>
            </Field>
            <Field>
              <Label>Receipt no.</Label>
              <Input
                value={payForm.receiptNumber}
                onChange={(e) => setPayForm((f) => ({ ...f, receiptNumber: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={() => void savePayment()}>
              Save payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
