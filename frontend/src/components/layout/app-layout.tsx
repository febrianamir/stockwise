import { ChevronsUpDown, LogOut, UserRound, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { UserAvatar } from '@/components/user-avatar'
import { Wordmark } from '@/components/wordmark'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { canAdministerPlatform } from '@/features/auth/permissions'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { useLogout } from '@/features/auth/use-logout'

/**
 * Application shell for logged-in pages (design-system §7): a dark sidebar with the account
 * menu (Profile, Log Out) and navigation grouped by area, and the page content. Company and branch context will
 * join the sidebar with company management.
 */
export function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        {/* SidebarInset is the page's <main>; this bar only holds the sidebar toggle. */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-4 md:px-6">
          <SidebarTrigger className="-ml-1.5" />
        </div>
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar() {
  const { data: user } = useCurrentUser()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  // On mobile the sidebar is a sheet: close it once the user picks a destination.
  const closeMobile = () => setOpenMobile(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AccountMenu />
      </SidebarHeader>

      <SidebarContent>
        {/* Profile and Log Out live in the account menu above. */}
        {canAdministerPlatform(user) && (
          <nav aria-label="Main">
            <SidebarGroup>
              <SidebarGroupLabel className="uppercase tracking-wide">Platform Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<NavLink to="/admin/users" onClick={closeMobile} />}
                      isActive={pathname.startsWith('/admin/users')}
                      tooltip="Users"
                    >
                      <Users aria-hidden="true" />
                      <span>Users</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </nav>
        )}
      </SidebarContent>

      <SidebarFooter>
        <Link
          to="/"
          onClick={closeMobile}
          aria-label="Stockwise Home"
          className="rounded-lg p-1 text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:[&_[data-slot=wordmark-text]]:sr-only"
        >
          <Wordmark />
        </Link>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** Signed-in user at the top of the sidebar, opening Profile and Log Out. */
function AccountMenu() {
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogout()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" aria-label={`Account menu for ${user?.name ?? 'you'}`} />}
          >
            <UserAvatar name={user?.name ?? '?'} className="after:border-sidebar-border" />
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{user?.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="w-(--anchor-width) min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span className="block truncate text-foreground">{user?.name}</span>
                <span className="block truncate font-normal">{user?.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link to="/profile" onClick={() => setOpenMobile(false)} />}>
              <UserRound aria-hidden="true" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
              <LogOut aria-hidden="true" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
