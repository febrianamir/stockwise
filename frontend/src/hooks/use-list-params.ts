import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

type ParamValue = string | number | undefined | null

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Kept by clear() unless a list passes its own keys. Module-level so `clear` stays stable. */
const KEEP_SORT = ['sort', 'direction'] as const

/** The value if it's one of `allowed`, otherwise `undefined`. */
export function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined
}

/** A `YYYY-MM-DD` value, otherwise `undefined`. */
export function dateParam(value: string | null): string | undefined {
  return value && DATE.test(value) ? value : undefined
}

/** A page number ≥ 1 (defaults to 1). */
export function pageParam(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

/**
 * List state (search, filters, sort, page) kept in the URL so views can be shared and reloaded
 * (ui-guidelines §6, api-conventions). Each list parses `params` into its own filter type.
 *
 * - `update(patch)` sets or removes keys; changing anything but `page` goes back to page 1.
 * - `clear()` removes every filter but keeps the keys in `keep` (by default the sort).
 */
export function useListParams(keep: readonly string[] = KEEP_SORT) {
  const [params, setParams] = useSearchParams()

  const update = useCallback(
    (patch: Record<string, ParamValue>) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === '') {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }
          if (!('page' in patch) || next.get('page') === '1') {
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
        for (const key of keep) {
          const value = previous.get(key)
          if (value) {
            next.set(key, value)
          }
        }
        return next
      },
      { replace: true },
    )
  }, [setParams, keep])

  return { params, update, clear }
}
