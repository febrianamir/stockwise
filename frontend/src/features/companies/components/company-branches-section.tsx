import { useQuery } from '@tanstack/react-query'
import { ArrowRight, MapPinned, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { BranchStatusBadge, BranchTypeBadge } from '@/components/company-badges'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { branchQueries, type BranchFilters, type Company } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { canInCompany } from '../permissions'

/** The first few branches; the full list is on the Branches page. 5 is the API's page minimum. */
const PREVIEW: BranchFilters = { sort: 'name', direction: 'asc', per_page: 5 }

/** Branches card on the company page: the entry point to branch management (branch-management PRD §8). */
export function CompanyBranchesSection({ company }: { company: Company }) {
  const { data, error, isPending, isFetching, refetch } = useQuery(branchQueries.list(company.id, PREVIEW))
  const canManage = canInCompany(company, 'manage-branches')
  const branchesUrl = `/companies/${company.id}/branches`
  const total = data?.meta.total ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Branches</h2>
        </CardTitle>
        <CardDescription>
          {data ? `${formatNumber(total)} ${total === 1 ? 'location' : 'locations'}${canManage ? '' : ' you can work in'}.` : 'Stores and warehouses.'}
        </CardDescription>
        {data && total > 0 && (
          <CardAction>
            <Button variant="outline" render={<Link to={branchesUrl} />} nativeButton={false}>
              View All Branches
              <ArrowRight data-icon="inline-end" aria-hidden="true" />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {error && !data ? (
          <Alert variant="destructive">
            <AlertDescription>Couldn't load branches. {error.message}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Retry
              </Button>
            </AlertAction>
          </Alert>
        ) : isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : total === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinned aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No branches yet.</EmptyTitle>
              <EmptyDescription>
                {canManage
                  ? 'Add your first store or warehouse to start working in a location.'
                  : "You don't have access to any branches yet. Ask the company's Owner or an Admin."}
              </EmptyDescription>
            </EmptyHeader>
            {canManage && (
              <EmptyContent>
                <Button render={<Link to={`${branchesUrl}/new`} />} nativeButton={false}>
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Add Branch
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border">
            {data.data.map((branch) => (
              <li key={branch.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Link to={`${branchesUrl}/${branch.id}`} className="truncate font-medium underline-offset-4 hover:underline">
                    {branch.name}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">{branch.code}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BranchTypeBadge type={branch.type} />
                  <BranchStatusBadge status={branch.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
