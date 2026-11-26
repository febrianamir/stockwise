import { useMemo } from 'react'
import { dateParam, oneOf, pageParam, useListParams } from '@/hooks/use-list-params'
import type { AdminCompanyFilters, AdminCompanySort, CompanyStatus, SortDirection } from '@/lib/api'

const STATUSES: CompanyStatus[] = ['active', 'suspended']
const SORTS: AdminCompanySort[] = ['name', 'created_at']
const DIRECTIONS: SortDirection[] = ['asc', 'desc']

export const DEFAULT_SORT: AdminCompanySort = 'created_at'
export const DEFAULT_DIRECTION: SortDirection = 'desc'
/** Matches the backend default (ListCompaniesRequest::DEFAULT_PER_PAGE). */
const PER_PAGE = 25

/** Company list filters, sort and page, kept in the URL (PRD §6.1). */
export function useCompanyFilters() {
  const { params, update, clear } = useListParams()

  const filters = useMemo<AdminCompanyFilters>(
    () => ({
      search: params.get('search')?.trim() || undefined,
      status: oneOf(params.get('status'), STATUSES),
      created_from: dateParam(params.get('created_from')),
      created_to: dateParam(params.get('created_to')),
      sort: oneOf(params.get('sort'), SORTS) ?? DEFAULT_SORT,
      direction: oneOf(params.get('direction'), DIRECTIONS) ?? DEFAULT_DIRECTION,
      page: pageParam(params.get('page')),
      per_page: PER_PAGE,
    }),
    [params],
  )

  const hasActiveFilters = Boolean(filters.search || filters.status || filters.created_from || filters.created_to)

  return { filters, update: update as (patch: Partial<Omit<AdminCompanyFilters, 'per_page'>>) => void, clear, hasActiveFilters }
}
