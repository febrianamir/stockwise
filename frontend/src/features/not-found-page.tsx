import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
      <Button variant="outline" render={<Link to="/" />} nativeButton={false}>
        Go to Stockwise
      </Button>
    </main>
  )
}
