import { ArrowDown, ArrowUp, ArrowUpDown, Building2, Eye, SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminCompany, AdminCompanySort, SortDirection } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CompanyStatusBadge } from '@/components/company-badges'

const SKELETON_ROWS = 5

interface CompaniesTableProps {
  companies: AdminCompany[] | undefined
  isLoading: boolean
  isStale: boolean
  sort: AdminCompanySort
  direction: SortDirection
  onSort: (sort: AdminCompanySort, direction: SortDirection) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
}

/** Desktop table and mobile list of companies (PRD §9). */
export function CompaniesTable({ companies, isLoading, isStale, sort, direction, onSort, hasActiveFilters, onClearFilters }: CompaniesTableProps) {
  if (!isLoading && companies?.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">{hasActiveFilters ? <SearchX aria-hidden="true" /> : <Building2 aria-hidden="true" />}</EmptyMedia>
          <EmptyTitle>{hasActiveFilters ? 'No companies match these filters.' : 'No companies yet.'}</EmptyTitle>
          <EmptyDescription>
            {hasActiveFilters ? 'Try a different search, or clear the filters to see every company.' : 'Create the first company and assign its owner.'}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={onClearFilters}>
              Clear Filters
            </Button>
          ) : (
            <Button render={<Link to="/admin/companies/new" />} nativeButton={false}>
              New Company
            </Button>
          )}
        </EmptyContent>
      </Empty>
    )
  }

  const sortable = (column: AdminCompanySort, label: string) => (
    <SortableHead column={column} label={label} sort={sort} direction={direction} onSort={onSort} />
  )

  return (
    <div aria-busy={isLoading || isStale} className={cn('transition-opacity', isStale && 'opacity-60')}>
      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {sortable('name', 'Company')}
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Members</TableHead>
              {sortable('created_at', 'Created At')}
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : companies?.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <Link to={`/admin/companies/${company.id}`} className="max-w-56 truncate font-medium underline-offset-4 hover:underline">
                          {company.name}
                        </Link>
                        <span className="font-mono text-xs text-muted-foreground">{company.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.owner ? (
                        <div className="flex min-w-0 flex-col">
                          <span className="max-w-48 truncate">{company.owner.name}</span>
                          <span className="max-w-48 truncate text-xs text-muted-foreground">{company.owner.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CompanyStatusBadge status={company.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(company.members_count)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(company.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link to={`/admin/companies/${company.id}`} />}
                        nativeButton={false}
                        aria-label={`View ${company.name}`}
                      >
                        <Eye aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y rounded-xl border bg-card md:hidden">
        {isLoading
          ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <li key={index} className="p-3">
                <Skeleton className="h-12 w-full" />
              </li>
            ))
          : companies?.map((company) => (
              <li key={company.id} className="flex flex-col gap-1 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/admin/companies/${company.id}`} className="truncate font-medium underline-offset-4 hover:underline">
                    {company.name}
                  </Link>
                  <CompanyStatusBadge status={company.status} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{company.code}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {company.owner ? `Owner: ${company.owner.name}` : 'No owner'} · {formatNumber(company.members_count)}{' '}
                  {company.members_count === 1 ? 'member' : 'members'}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">Created {formatDate(company.created_at)}</span>
              </li>
            ))}
      </ul>
    </div>
  )
}

function SortableHead({
  column,
  label,
  sort,
  direction,
  onSort,
}: {
  column: AdminCompanySort
  label: string
  sort: AdminCompanySort
  direction: SortDirection
  onSort: (sort: AdminCompanySort, direction: SortDirection) => void
}) {
  const isActive = sort === column
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  const firstDirection: SortDirection = column === 'name' ? 'asc' : 'desc'
  const nextDirection: SortDirection = isActive ? (direction === 'asc' ? 'desc' : 'asc') : firstDirection

  return (
    <TableHead aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Button variant="ghost" size="sm" className="-ml-2 text-sm font-medium" onClick={() => onSort(column, nextDirection)}>
        {label}
        <Icon data-icon="inline-end" aria-hidden="true" className={cn(!isActive && 'text-muted-foreground')} />
      </Button>
    </TableHead>
  )
}
