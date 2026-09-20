import { Suspense, lazy, type ComponentType } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { AppShell } from '@/layouts/app-shell'
import { AppToaster } from '@/components/shared/app-toaster'
import { FullPageLoader } from '@/components/shared/loading-state'
import { canAccessPath } from '@/lib/roles'

function lazyPage<T extends ComponentType<object>>(factory: () => Promise<{ default: T } | Record<string, T>>, exportName?: string) {
  return lazy(async () => {
    const mod = await factory()
    if (exportName && exportName in mod) {
      return { default: (mod as Record<string, T>)[exportName]! }
    }
    return mod as { default: T }
  })
}

const LoginPage = lazyPage(() => import('@/views/login-page'), 'LoginPage')
const DashboardPage = lazyPage(() => import('@/views/dashboard-page'), 'DashboardPage')
const StudentsPage = lazyPage(() => import('@/views/students-page'), 'StudentsPage')
const StudentDetailPage = lazyPage(() => import('@/views/student-detail-page'), 'StudentDetailPage')
const TeachersPage = lazyPage(() => import('@/views/teachers-page'), 'TeachersPage')
const TeacherDetailPage = lazyPage(() => import('@/views/teachers-page'), 'TeacherDetailPage')
const ClassesPage = lazyPage(() => import('@/views/classes-subjects-page'), 'ClassesPage')
const SubjectsPage = lazyPage(() => import('@/views/classes-subjects-page'), 'SubjectsPage')
const AttendancePage = lazyPage(() => import('@/views/attendance-page'), 'AttendancePage')
const ExaminationsPage = lazyPage(() => import('@/views/exams-results-page'), 'ExaminationsPage')
const ResultsPage = lazyPage(() => import('@/views/exams-results-page'), 'ResultsPage')
const FeesPage = lazyPage(() => import('@/views/fees-parents-page'), 'FeesPage')
const ParentsPage = lazyPage(() => import('@/views/fees-parents-page'), 'ParentsPage')
const ParentDetailPage = lazyPage(() => import('@/views/fees-parents-page'), 'ParentDetailPage')
const AnnouncementsPage = lazyPage(() => import('@/views/ops-pages'), 'AnnouncementsPage')
const AuditLogsPage = lazyPage(() => import('@/views/ops-pages'), 'AuditLogsPage')
const InventoryPage = lazyPage(() => import('@/views/ops-pages'), 'InventoryPage')
const LibraryPage = lazyPage(() => import('@/views/ops-pages'), 'LibraryPage')
const ReportsPage = lazyPage(() => import('@/views/ops-pages'), 'ReportsPage')
const TransportPage = lazyPage(() => import('@/views/ops-pages'), 'TransportPage')
const UsersRolesPage = lazyPage(() => import('@/views/ops-pages'), 'UsersRolesPage')
const SettingsPage = lazyPage(() => import('@/views/settings-page'), 'SettingsPage')

function RouteFallback() {
  return (
    <FullPageLoader title="Loading" description="Preparing this screen…" />
  )
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <FullPageLoader
        title="Signing you in"
        description="Restoring your Viste High School session…"
      />
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function RoleRoute() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  if (!canAccessPath(user.role, location.pathname)) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route element={<RoleRoute />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:id" element={<StudentDetailPage />} />
                <Route path="/teachers" element={<TeachersPage />} />
                <Route path="/teachers/:id" element={<TeacherDetailPage />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/subjects" element={<SubjectsPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/examinations" element={<ExaminationsPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/fees" element={<FeesPage />} />
                <Route path="/parents" element={<ParentsPage />} />
                <Route path="/parents/:id" element={<ParentDetailPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/transport" element={<TransportPage />} />
                <Route path="/users" element={<UsersRolesPage />} />
                <Route path="/roles" element={<Navigate to="/users" replace />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      <AppToaster />
    </BrowserRouter>
  )
}
