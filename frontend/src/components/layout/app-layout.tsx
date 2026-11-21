import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { Wordmark } from '@/components/wordmark'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentUser } from '@/features/auth/use-current-user'
import { useLogout } from '@/features/auth/use-logout'

/**
 * Temporary shell for logged-in pages: wordmark and user menu. The full application shell
 * (dark sidebar, company and branch context) arrives with the dashboard (PRD §8).
 */
export function AppLayout() {
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogout()

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
          <Link to="/" aria-label="Stockwise home" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Wordmark />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="max-w-56" />}>
              <UserRound data-icon="inline-start" aria-hidden="true" />
              <span className="truncate">{user?.name}</span>
              <ChevronDown data-icon="inline-end" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <span className="block truncate text-foreground">{user?.name}</span>
                  <span className="block truncate font-normal">{user?.email}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/profile" />}>
                <UserRound aria-hidden="true" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                <LogOut aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}
