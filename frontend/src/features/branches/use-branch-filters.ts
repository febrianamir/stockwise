import { useMemo } from 'react'
import { oneOf, pageParam, useListParams } from '@/hooks/use-list-params'
import type { BranchFilters, BranchSort, BranchStatus, BranchType, SortDirection } from '@/lib/api'

const STATUSES: BranchStatus[] = ['active', 'inactive']
const TYPES: BranchType[] = ['store', 'warehouse']
const SORTS: BranchSort[] = ['name', 'code', 'created_at']
const DIRECTIONS: SortDirection[] = ['asc', 'desc']

export const DEFAULT_SORT: BranchSort = 'name'
export const DEFAULT_DIRECTION: SortDirection = 'asc'
/** Matches the backend default (ListBranchesRequest::DEFAULT_PER_PAGE). */
const PER_PAGE = 25

/** Branch list search, filters, sort and page, kept in the URL (branch-management PRD §8.1). */
export function useBranchFilters() {
  const { params, update, clear } = useListParams()

  const filters = useMemo<BranchFilters>(
    () => ({
      search: params.get('search')?.trim() || undefined,
      status: oneOf(params.get('status'), STATUSES),
      type: oneOf(params.get('type'), TYPES),
      sort: oneOf(params.get('sort'), SORTS) ?? DEFAULT_SORT,
      direction: oneOf(params.get('direction'), DIRECTIONS) ?? DEFAULT_DIRECTION,
      page: pageParam(params.get('page')),
      per_page: PER_PAGE,
    }),
    [params],
  )

  const hasActiveFilters = Boolean(filters.search || filters.status || filters.type)

  return { filters, update: update as (patch: Partial<Omit<BranchFilters, 'per_page'>>) => void, clear, hasActiveFilters }
}
