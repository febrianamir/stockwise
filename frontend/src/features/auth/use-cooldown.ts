import { useCallback, useEffect, useState } from 'react'
import { isApiError, type RetryAfterBody } from '@/lib/api'

/** A countdown in seconds, e.g. for the "Resend code" button (AUTH-7). */
export function useCooldown(initialSeconds = 0) {
  const [now, setNow] = useState(() => Date.now())
  const [endsAt, setEndsAt] = useState<number | null>(() => (initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : null))

  useEffect(() => {
    if (endsAt === null) {
      return
    }

    const interval = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= endsAt) {
        setEndsAt(null)
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [endsAt])

  const start = useCallback((seconds: number) => {
    const current = Date.now()
    setNow(current)
    setEndsAt(current + seconds * 1000)
  }, [])

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000))

  return { remaining, start }
}

/** Seconds to wait from a 429 response, if the error is one. */
export function retryAfterSeconds(error: unknown): number | null {
  if (!isApiError(error) || error.status !== 429) {
    return null
  }

  const retryAfter = (error.body as Partial<RetryAfterBody> | null)?.retry_after

  return typeof retryAfter === 'number' ? retryAfter : null
}
