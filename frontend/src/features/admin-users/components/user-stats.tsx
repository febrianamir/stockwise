import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminUserQueries } from '@/lib/api'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'

const CARDS = [
  { key: 'total', label: 'Total Users', className: 'text-foreground' },
  { key: 'active', label: 'Active', className: 'text-success' },
  { key: 'inactive', label: 'Inactive', className: 'text-destructive' },
  { key: 'pending', label: 'Pending', className: 'text-warning' },
] as const

/** Platform-wide counts. Fails independently of the table (PRD §9). */
export function UserStats() {
  const { data, error, isPending, refetch, isFetching } = useQuery(adminUserQueries.stats())

  if (error) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Couldn't load user counts. {error.message}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => (
        <Card key={card.key} size="sm">
          <CardContent>
            <dl className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">{card.label}</dt>
              <dd className={cn('text-2xl font-semibold tabular-nums', card.className)}>
                {isPending ? <Skeleton className="h-8 w-16" /> : formatNumber(data[card.key])}
              </dd>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
