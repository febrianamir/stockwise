import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { ListPagination } from '@/components/list-pagination'
import { PageLoading } from '@/components/page-status'
import { Button } from '@/components/ui/button'
import { canInCompany } from '@/features/companies/permissions'
import { branchQueries, companyQueries } from '@/lib/api'
import { BranchLoadError } from '../components/branch-load-error'
import { BranchesTable } from '../components/branches-table'
import { BranchesToolbar } from '../components/branches-toolbar'
import { DEFAULT_DIRECTION, DEFAULT_SORT, useBranchFilters } from '../use-branch-filters'

/** /companies/:companyId/branches: docs/features/branch-management/prd.md §8.1. */
export function BranchesPage() {
  const companyId = useParams().companyId ?? ''
  const company = useQuery(companyQueries.detail(companyId))
  const { filters, update, clear, hasActiveFilters } = useBranchFilters()
  const branches = useQuery(branchQueries.list(companyId, filters))

  if (company.error && !company.data) {
    return <BranchLoadError error={company.error} companyId={companyId} subject="this company" onRetry={() => company.refetch()} isRetrying={company.isFetching} />
  }

  if (company.isPending) {
    return <PageLoading label="Loading branches…" />
  }

  const canManage = canInCompany(company.data, 'manage-branches')

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/companies/${companyId}`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {company.data.name}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
          <p className="text-sm text-muted-foreground">
            {canManage ? "The company's stores and warehouses." : 'The stores and warehouses you can work in.'}
          </p>
        </div>
        {canManage && (
          <Button render={<Link to={`/companies/${companyId}/branches/new`} />} nativeButton={false}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add Branch
          </Button>
        )}
      </div>

      <section aria-label="Branches" className="flex flex-col gap-4">
        <BranchesToolbar filters={filters} update={update} clear={clear} hasActiveFilters={hasActiveFilters} />

        {branches.error && !branches.data ? (
          <BranchLoadError error={branches.error} companyId={companyId} subject="branches" onRetry={() => branches.refetch()} isRetrying={branches.isFetching} />
        ) : (
          <>
            <BranchesTable
              companyId={companyId}
              branches={branches.data?.data}
              isLoading={branches.isPending}
              isStale={branches.isPlaceholderData}
              sort={filters.sort ?? DEFAULT_SORT}
              direction={filters.direction ?? DEFAULT_DIRECTION}
              onSort={(sort, direction) => update({ sort, direction })}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={clear}
              canManage={canManage}
            />
            {branches.data && <ListPagination meta={branches.data.meta} onPageChange={(page) => update({ page })} />}
          </>
        )}
      </section>
    </div>
  )
}
