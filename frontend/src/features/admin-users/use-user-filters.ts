import { useMemo } from 'react'
import { dateParam, oneOf, pageParam, useListParams } from '@/hooks/use-list-params'
import type { AdminUserFilters, AdminUserSort, SortDirection, UserStatus } from '@/lib/api'

const STATUSES: UserStatus[] = ['active', 'pending', 'inactive']
const VERIFICATIONS = ['verified', 'unverified'] as const
const COMPANY = ['has', 'none'] as const
const SORTS: AdminUserSort[] = ['name', 'created_at', 'last_login_at']
const DIRECTIONS: SortDirection[] = ['asc', 'desc']

export const DEFAULT_SORT: AdminUserSort = 'created_at'
export const DEFAULT_DIRECTION: SortDirection = 'desc'
/** Matches the backend default (ListUsersRequest::DEFAULT_PER_PAGE). */
const PER_PAGE = 25

/** User list filters, sort and page, kept in the URL (PRD §6.1). */
export function useUserFilters() {
  const { params, update, clear } = useListParams()

  const filters = useMemo<AdminUserFilters>(
    () => ({
      search: params.get('search')?.trim() || undefined,
      status: oneOf(params.get('status'), STATUSES),
      verification: oneOf(params.get('verification'), VERIFICATIONS),
      company: oneOf(params.get('company'), COMPANY),
      created_from: dateParam(params.get('created_from')),
      created_to: dateParam(params.get('created_to')),
      sort: oneOf(params.get('sort'), SORTS) ?? DEFAULT_SORT,
      direction: oneOf(params.get('direction'), DIRECTIONS) ?? DEFAULT_DIRECTION,
      page: pageParam(params.get('page')),
      per_page: PER_PAGE,
    }),
    [params],
  )

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.verification || filters.company || filters.created_from || filters.created_to,
  )

  return { filters, update: update as (patch: Partial<Omit<AdminUserFilters, 'per_page'>>) => void, clear, hasActiveFilters }
}
