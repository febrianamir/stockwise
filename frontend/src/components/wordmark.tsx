import { Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-base font-semibold tracking-tight', className)}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Boxes aria-hidden="true" />
      </span>
      <span data-slot="wordmark-text">Stockwise</span>
    </span>
  )
}
