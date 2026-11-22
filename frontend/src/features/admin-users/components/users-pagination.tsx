import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginatedResource } from '@/lib/api'
import { formatNumber } from '../format'

/** "Showing x–y of z" with previous and next (server-side pagination, UM-9). */
export function UsersPagination({ meta, onPageChange }: { meta: PaginatedResource<unknown>['meta']; onPageChange: (page: number) => void }) {
  if (meta.total === 0) {
    return null
  }

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-2 text-sm sm:flex-row">
      <p className="text-muted-foreground tabular-nums">
        Showing {formatNumber(meta.from ?? 0)}–{formatNumber(meta.to ?? 0)} of {formatNumber(meta.total)}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground tabular-nums">
          Page {formatNumber(meta.current_page)} of {formatNumber(meta.last_page)}
        </span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(meta.current_page - 1)} disabled={meta.current_page <= 1}>
          <ChevronLeft data-icon="inline-start" aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(meta.current_page + 1)}
          disabled={meta.current_page >= meta.last_page}
        >
          Next
          <ChevronRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
