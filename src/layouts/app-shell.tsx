import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { BrandMark } from '@/components/shared/brand-mark'
import { notify } from '@/lib/notify'
import { SchoolLogo } from '@/components/shared/school-logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { PageTransition } from '@/components/shared/page-transition'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/contexts/auth-context'
import { getMainNavForRole, getNavGroupsForRole, type NavGroup } from '@/lib/navigation'
import { canAccessPath } from '@/lib/roles'
import { cn } from '@/lib/utils'

function SidebarNav({ collapsed, groups }: { collapsed: boolean; groups: NavGroup[] }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
      {groups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-black transition-colors duration-150 hover:bg-sidebar-accent dark:text-sidebar-foreground',
                      isActive && 'bg-sidebar-accent font-semibold text-black shadow-sm dark:text-sidebar-accent-foreground',
                      collapsed && 'justify-center px-2',
                    )
                  }
                  title={item.label}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-primary dark:text-primary'
                            : 'text-accent group-hover:text-primary dark:text-accent',
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate text-black dark:text-inherit">{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user, permissions, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const roleNav = useMemo(
    () => (user ? getNavGroupsForRole(user.role, permissions) : []),
    [user, permissions],
  )
  const roleMainNav = useMemo(
    () => (user ? getMainNavForRole(user.role, permissions) : []),
    [user, permissions],
  )

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const pageTitle = useMemo(() => {
    const match = roleMainNav.find(
      (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    )
    return match?.label ?? 'Viste High School'
  }, [location.pathname, roleMainNav])

  const searchLinks = useMemo(
    () =>
      [
        { label: 'Students', to: '/students' },
        { label: 'Teachers & Staff', to: '/teachers' },
        { label: 'Fees & Payments', to: '/fees' },
        { label: 'Attendance', to: '/attendance' },
        { label: 'Results', to: '/results' },
      ].filter((link) => (user ? canAccessPath(user.role, link.to, permissions) : false)),
    [user, permissions],
  )

  async function handleLogout() {
    await notify.process(() => logout(), {
      loading: 'Signing you out…',
      success: 'Signed out successfully',
      error: 'Could not sign out',
    })
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out lg:flex',
          collapsed ? 'w-[80px]' : 'w-[272px]',
        )}
      >
        <div className={cn('flex items-center justify-between gap-2 px-4 py-5', collapsed && 'px-2')}>
          <BrandMark compact={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>
        </div>
        <SidebarNav collapsed={collapsed} groups={roleNav} />
        <div className="mt-auto border-t border-sidebar-border p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border border-border/70 bg-card p-2.5 shadow-card',
              collapsed && 'justify-center',
            )}
          >
            <Avatar name={user?.name ?? 'User'} src={user?.avatarUrl} />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-black dark:text-foreground">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.role.replaceAll('_', ' ')}
                </p>
              </div>
            )}
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => setLogoutOpen(true)}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/45"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-[300px] flex-col bg-sidebar shadow-elevated"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="flex items-center justify-between px-4 py-4">
                <BrandMark />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => setMobileOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <SidebarNav collapsed={false} groups={roleNav} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'transition-[padding] duration-300 ease-out',
          collapsed ? 'lg:pl-[80px]' : 'lg:pl-[272px]',
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border/70 bg-card/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu />
            </Button>

            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <SchoolLogo size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Viste High School</p>
                <p className="truncate text-xs text-muted-foreground">{pageTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Search">
                    <Search />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2">
                  <DropdownMenuLabel className="px-2 pb-2">Search</DropdownMenuLabel>
                  <div className="relative px-1 pb-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Students, staff, fees…"
                      className="h-9 pl-9"
                      autoFocus
                    />
                  </div>
                  <DropdownMenuSeparator />
                  {searchLinks.map((link) => (
                    <DropdownMenuItem key={link.to} onClick={() => navigate(link.to)}>
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    className="relative"
                  >
                    <Bell />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Fee reminder · 12 accounts</DropdownMenuItem>
                  <DropdownMenuItem>Science CAT submitted</DropdownMenuItem>
                  <DropdownMenuItem>Library Week published</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar name={user?.name ?? 'User'} src={user?.avatarUrl} />
                    <span className="hidden text-left lg:block">
                      <span className="block text-sm font-semibold leading-none">
                        {user?.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user?.role.replaceAll('_', ' ')}
                      </span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>
                    <UserRound className="h-4 w-4" /> My profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLogoutOpen(true)}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </main>

        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
          Viste High School Management System · Firebase Auth + Firestore ·{' '}
          <Link to="/settings" className="underline-offset-2 hover:underline">
            Settings
          </Link>
        </footer>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Sign out?"
        description="You will need to sign in again to access the school console."
        confirmLabel="Sign out"
        onConfirm={() => {
          void handleLogout()
        }}
      />
    </div>
  )
}
