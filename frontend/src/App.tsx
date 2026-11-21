import { useQuery } from '@tanstack/react-query'
import { CircleCheck, CircleX, LoaderCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { userQueries } from '@/lib/api'

function ApiStatus() {
  const { data: user, error, isPending, isFetching, refetch } = useQuery(userQueries.current())

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Connecting to API…
      </div>
    )
  }

  // A 401 means the API answered: it's reachable, the visitor just isn't signed in.
  const isReachable = user !== undefined || error?.isUnauthorized === true

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        {isReachable ? (
          <CircleCheck className="size-4 text-emerald-600" />
        ) : (
          <CircleX className="size-4 text-destructive" />
        )}
        <span>
          {user && <>Signed in as {user.name}</>}
          {error?.isUnauthorized && 'API connected · not signed in'}
          {error && !error.isUnauthorized && `API error: ${error.message}`}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
        <RefreshCw className={isFetching ? 'animate-spin' : undefined} />
        Retry
      </Button>
    </div>
  )
}

function App() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Stockwise</CardTitle>
          <CardDescription>Point of sale for multiple stores, warehouses and cashiers</CardDescription>
          <CardAction>
            <Badge variant="secondary">v0.1</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ApiStatus />
        </CardContent>
      </Card>
    </main>
  )
}

export default App
