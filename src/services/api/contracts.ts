import { demoCredentials } from '@/mocks/data'
import type { AuthUser, DashboardStats, Payment, Student } from '@/types'

export interface AuthService {
  login(email: string, password: string, remember?: boolean): Promise<AuthUser>
  logout(): Promise<void>
  getDemoCredentials(): typeof demoCredentials
  updateProfile(userId: string, patch: Partial<AuthUser>): Promise<AuthUser>
}

export interface StudentService {
  list(): Promise<Student[]>
  getById(id: string): Promise<Student | undefined>
}

export interface DashboardService {
  getStats(): Promise<DashboardStats>
  getEnrollmentTrend(): Promise<{ month: string; students: number }[]>
  getAttendanceOverview(): Promise<{ name: string; value: number }[]>
  getFeeCollection(): Promise<{ month: string; collected: number; outstanding: number }[]>
  getPerformance(): Promise<{ subject: string; average: number }[]>
  getRecentPayments(): Promise<Payment[]>
  getRecentActivities(): Promise<{ id: string; title: string; detail: string; at: string }[]>
}
