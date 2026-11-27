import { X } from 'lucide-react'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { BranchFilters } from '@/lib/api'

const ALL = 'all'

const STATUS_ITEMS = [
  { value: ALL, label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const TYPE_ITEMS = [
  { value: ALL, label: 'All Types' },
  { value: 'store', label: 'Stores' },
  { value: 'warehouse', label: 'Warehouses' },
]

interface BranchesToolbarProps {
  filters: BranchFilters
  update: (patch: Partial<BranchFilters>) => void
  clear: () => void
  hasActiveFilters: boolean
}

/** Search and filters for the branch list (branch-management PRD §8.1). */
export function BranchesToolbar({ filters, update, clear, hasActiveFilters }: BranchesToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="sm:max-w-sm sm:flex-1">
        <SearchInput label="Search Branches" placeholder="Search by name or code…" value={filters.search} onSearch={(search) => update({ search })} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={STATUS_ITEMS}
          value={filters.status ?? ALL}
          onValueChange={(value) => update({ status: value === ALL ? undefined : (value as BranchFilters['status']) })}
        >
          <SelectTrigger aria-label="Branch Status" className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={TYPE_ITEMS}
          value={filters.type ?? ALL}
          onValueChange={(value) => update({ type: value === ALL ? undefined : (value as BranchFilters['type']) })}
        >
          <SelectTrigger aria-label="Branch Type" className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clear}>
            <X data-icon="inline-start" aria-hidden="true" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
