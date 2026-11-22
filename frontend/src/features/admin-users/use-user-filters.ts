import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { AdminUserFilters, AdminUserSort, SortDirection, UserStatus } from '@/lib/api'

const STATUSES: UserStatus[] = ['active', 'pending', 'inactive']
const VERIFICATIONS = ['verified', 'unverified'] as const
const SORTS: AdminUserSort[] = ['name', 'created_at', 'last_login_at']
const DIRECTIONS: SortDirection[] = ['asc', 'desc']
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_SORT: AdminUserSort = 'created_at'
export const DEFAULT_DIRECTION: SortDirection = 'desc'
/** Matches the backend default (ListUsersRequest::DEFAULT_PER_PAGE). */
const PER_PAGE = 25

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined
}

/**
 * List filters, sort and page live in the URL so views can be shared and survive reloads
 * (ui-guidelines §14, PRD §6.1). Changing anything but the page resets to page 1.
 */
export function useUserFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<AdminUserFilters>(() => {
    const page = Number(params.get('page'))
    const createdFrom = params.get('created_from')
    const createdTo = params.get('created_to')

    return {
      search: params.get('search')?.trim() || undefined,
      status: oneOf(params.get('status'), STATUSES),
      verification: oneOf(params.get('verification'), VERIFICATIONS),
      created_from: createdFrom && DATE.test(createdFrom) ? createdFrom : undefined,
      created_to: createdTo && DATE.test(createdTo) ? createdTo : undefined,
      sort: oneOf(params.get('sort'), SORTS) ?? DEFAULT_SORT,
      direction: oneOf(params.get('direction'), DIRECTIONS) ?? DEFAULT_DIRECTION,
      page: Number.isInteger(page) && page > 1 ? page : 1,
      per_page: PER_PAGE,
    }
  }, [params])

  const update = useCallback(
    (patch: Partial<Omit<AdminUserFilters, 'per_page'>>) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || value === null) {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }
          if (!('page' in patch)) {
            next.delete('page')
          }
          if (next.get('page') === '1') {
            next.delete('page')
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clear = useCallback(() => {
    setParams(
      (previous) => {
        const next = new URLSearchParams()
        for (const key of ['sort', 'direction']) {
          const value = previous.get(key)
          if (value) {
            next.set(key, value)
          }
        }
        return next
      },
      { replace: true },
    )
  }, [setParams])

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.verification || filters.created_from || filters.created_to,
  )

  return { filters, update, clear, hasActiveFilters }
}
