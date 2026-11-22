import { Ellipsis, Eye, RotateCcw, UserX } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AdminUser } from '@/lib/api'
import { useCurrentUser } from '@/features/auth/use-current-user'
import type { StatusAction } from './user-status-dialog'

/** Row menu: View Details, Deactivate or Reactivate (PRD §8). The table owns the confirmation dialog. */
export function UserRowActions({ user, onAction }: { user: AdminUser; onAction: (user: AdminUser, action: StatusAction) => void }) {
  const { data: currentUser } = useCurrentUser()
  const isSelf = currentUser?.id === user.id

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.name}`} />}>
        <Ellipsis aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem render={<Link to={`/admin/users/${user.id}`} />}>
          <Eye aria-hidden="true" />
          View Details
        </DropdownMenuItem>
        {!isSelf && (
          <>
            <DropdownMenuSeparator />
            {user.status === 'inactive' ? (
              <DropdownMenuItem onClick={() => onAction(user, 'reactivate')}>
                <RotateCcw aria-hidden="true" />
                Reactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem variant="destructive" onClick={() => onAction(user, 'deactivate')}>
                <UserX aria-hidden="true" />
                Deactivate
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
