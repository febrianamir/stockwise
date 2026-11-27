import { Eye, MapPinned, SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { BranchStatusBadge, BranchTypeBadge } from '@/components/company-badges'
import { SortableHead } from '@/components/sortable-head'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Branch, BranchSort, SortDirection } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const SKELETON_ROWS = 4

interface BranchesTableProps {
  companyId: string
  branches: Branch[] | undefined
  isLoading: boolean
  isStale: boolean
  sort: BranchSort
  direction: SortDirection
  onSort: (sort: BranchSort, direction: SortDirection) => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  /** Whether the viewer can add branches (`manage-branches`), for the empty state. */
  canManage: boolean
}

/** Desktop table and mobile list of branches (branch-management PRD §8.1). */
export function BranchesTable({
  companyId,
  branches,
  isLoading,
  isStale,
  sort,
  direction,
  onSort,
  hasActiveFilters,
  onClearFilters,
  canManage,
}: BranchesTableProps) {
  const branchUrl = (branch: Branch) => `/companies/${companyId}/branches/${branch.id}`

  if (!isLoading && branches?.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">{hasActiveFilters ? <SearchX aria-hidden="true" /> : <MapPinned aria-hidden="true" />}</EmptyMedia>
          <EmptyTitle>{hasActiveFilters ? 'No branches match these filters.' : 'No branches yet.'}</EmptyTitle>
          <EmptyDescription>
            {hasActiveFilters
              ? 'Try a different search, or clear the filters to see every branch.'
              : canManage
                ? 'Add your first store or warehouse to start working in a location.'
                : "You don't have access to any branches yet. Ask the company's Owner or an Admin to give you access."}
          </EmptyDescription>
        </EmptyHeader>
        {(hasActiveFilters || canManage) && (
          <EmptyContent>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={onClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button render={<Link to={`/companies/${companyId}/branches/new`} />} nativeButton={false}>
                Add Branch
              </Button>
            )}
          </EmptyContent>
        )}
      </Empty>
    )
  }

  return (
    <div aria-busy={isLoading || isStale} className={cn('transition-opacity', isStale && 'opacity-60')}>
      <div className="hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead column="name" label="Branch" sort={sort} direction={direction} onSort={onSort} />
              <SortableHead column="code" label="Code" sort={sort} direction={direction} onSort={onSort} />
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <SortableHead column="created_at" label="Created At" sort={sort} direction={direction} onSort={onSort} firstDirection="desc" />
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : branches?.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <Link to={branchUrl(branch)} className="block max-w-64 truncate font-medium underline-offset-4 hover:underline">
                        {branch.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{branch.code}</TableCell>
                    <TableCell>
                      <BranchTypeBadge type={branch.type} />
                    </TableCell>
                    <TableCell>
                      <BranchStatusBadge status={branch.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(branch.members_count ?? 0)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(branch.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm" render={<Link to={branchUrl(branch)} />} nativeButton={false} aria-label={`View ${branch.name}`}>
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
          : branches?.map((branch) => (
              <li key={branch.id} className="flex flex-col gap-1.5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Link to={branchUrl(branch)} className="truncate font-medium underline-offset-4 hover:underline">
                    {branch.name}
                  </Link>
                  <BranchStatusBadge status={branch.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-xs">{branch.code}</span>
                  <BranchTypeBadge type={branch.type} />
                  <span className="tabular-nums">
                    {formatNumber(branch.members_count ?? 0)} {branch.members_count === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </li>
            ))}
      </ul>
    </div>
  )
}
