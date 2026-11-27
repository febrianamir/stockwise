import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableHead } from '@/components/ui/table'
import type { SortDirection } from '@/lib/api'
import { cn } from '@/lib/utils'

interface SortableHeadProps<T extends string> {
  column: T
  label: string
  sort: T
  direction: SortDirection
  onSort: (sort: T, direction: SortDirection) => void
  /** Direction on the first click: `asc` for text columns, `desc` for dates. */
  firstDirection?: SortDirection
}

/** A table header that sorts its column, with `aria-sort` (api-conventions "Lists"). */
export function SortableHead<T extends string>({ column, label, sort, direction, onSort, firstDirection = 'asc' }: SortableHeadProps<T>) {
  const isActive = sort === column
  const Icon = !isActive ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
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
