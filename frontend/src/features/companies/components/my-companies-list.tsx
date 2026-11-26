import { useQuery } from '@tanstack/react-query'
import { Building2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyStatusBadge, OwnerBadge } from '@/components/company-badges'
import { ROLE_LABELS } from '@/lib/company'
import { companyQueries } from '@/lib/api'
import { formatDate } from '@/lib/format'

/**
 * The current user's companies (CW-8), on My Companies and the profile page. Suspended
 * companies are shown but can't be opened.
 */
export function MyCompaniesList() {
  const { data: companies, error, isPending, isFetching, refetch } = useQuery(companyQueries.mine())

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Couldn't load your companies. {error.message}</span>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          Retry
        </Button>
      </div>
    )
  }

  if (companies.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>You don't belong to any company yet.</EmptyTitle>
          <EmptyDescription>A company owner or admin can add you with the email you use for Stockwise.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {companies.map((company) => (
        <li key={company.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            {company.status === 'active' ? (
              <Link to={`/companies/${company.id}`} className="truncate font-medium underline-offset-4 hover:underline">
                {company.name}
              </Link>
            ) : (
              <span className="truncate font-medium">{company.name}</span>
            )}
            <span className="text-xs text-muted-foreground">
              <span className="font-mono">{company.code}</span> · Joined {formatDate(company.joined_at)}
            </span>
            {company.status === 'suspended' && (
              <span className="text-xs text-muted-foreground">This company is suspended. Contact your Stockwise administrator.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {company.is_owner ? <OwnerBadge /> : <span className="text-sm text-muted-foreground">{ROLE_LABELS[company.role]}</span>}
            {company.status === 'suspended' && <CompanyStatusBadge status={company.status} />}
          </div>
        </li>
      ))}
    </ul>
  )
}
