import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { AppShell } from '@/layouts/app-shell'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { StudentsPage } from '@/pages/students-page'
import { StudentDetailPage } from '@/pages/student-detail-page'
import { TeachersPage, TeacherDetailPage } from '@/pages/teachers-page'
import { ClassesPage, SubjectsPage } from '@/pages/classes-subjects-page'
import { AttendancePage } from '@/pages/attendance-page'
import { ExaminationsPage, ResultsPage } from '@/pages/exams-results-page'
import { FeesPage, ParentsPage, ParentDetailPage } from '@/pages/fees-parents-page'
import {
  AnnouncementsPage,
  AuditLogsPage,
  InventoryPage,
  LibraryPage,
  ReportsPage,
  TransportPage,
  UsersRolesPage,
} from '@/pages/ops-pages'
import { SettingsPage } from '@/pages/settings-page'
import { LoadingState } from '@/components/shared/loading-state'
import { canAccessPath } from '@/lib/roles'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <LoadingState rows={3} />
        </div>
      </div>
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
      <Toaster
        richColors
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: 'rounded-xl border border-border shadow-elevated',
          },
        }}
      />
    </BrowserRouter>
  )
}
