import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminCompanyQueries } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const CARDS = [
  { key: 'total', label: 'Total Companies', className: 'text-foreground' },
  { key: 'active', label: 'Active', className: 'text-success' },
  { key: 'suspended', label: 'Suspended', className: 'text-destructive' },
] as const

/** Platform-wide company counts. Fails independently of the table. */
export function CompanyStats() {
  const { data, error, isPending, refetch, isFetching } = useQuery(adminCompanyQueries.stats())

  if (error) {
    return (
      <Card size="sm">
        <CardContent className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Couldn't load company counts. {error.message}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {CARDS.map((card) => (
        <Card key={card.key} size="sm" className={card.key === 'total' ? 'col-span-2 lg:col-span-1' : undefined}>
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
