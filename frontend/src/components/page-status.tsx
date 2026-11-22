import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/** Full-page loading indicator, e.g. while the session loads. */
export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

/** Full-page error with a retry action. */
export function PageError({ message, onRetry, isRetrying }: { message: string; onRetry: () => void; isRetrying?: boolean }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm font-medium">Something Went Wrong</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? <Spinner data-icon="inline-start" aria-hidden="true" /> : <RefreshCw data-icon="inline-start" aria-hidden="true" />}
        Try Again
      </Button>
    </div>
  )
}
