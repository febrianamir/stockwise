import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Stand-alone page by default; `embedded` renders inside an existing layout's <main>. */
export function NotFoundPage({ embedded = false }: { embedded?: boolean }) {
  const Root = embedded ? 'div' : 'main'

  return (
    <Root className={cn('flex flex-col items-center justify-center gap-3 p-4 text-center', embedded ? 'py-16' : 'min-h-svh')}>
      <h1 className="text-lg font-semibold">Page Not Found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
      <Button variant="outline" render={<Link to="/" />} nativeButton={false}>
        Go to Stockwise
      </Button>
    </Root>
  )
}
