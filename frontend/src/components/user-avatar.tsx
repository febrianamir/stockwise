import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { initials } from '@/lib/format'

/** Initials avatar. Profile images aren't stored yet. */
export function UserAvatar({ name, size = 'default', className }: { name: string; size?: 'default' | 'sm' | 'lg'; className?: string }) {
  return (
    <Avatar size={size} className={className} aria-hidden="true">
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}
