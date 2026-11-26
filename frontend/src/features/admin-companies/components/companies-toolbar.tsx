import { X } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminCompanyFilters } from '@/lib/api'

const ALL = 'all'

const STATUS_ITEMS = [
  { value: ALL, label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

interface CompaniesToolbarProps {
  filters: AdminCompanyFilters
  update: (patch: Partial<AdminCompanyFilters>) => void
  clear: () => void
  hasActiveFilters: boolean
}

/** Search and filters (PRD §6.1). */
export function CompaniesToolbar({ filters, update, clear, hasActiveFilters }: CompaniesToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        label="Search Companies"
        placeholder="Search by name, code, legal name or email…"
        value={filters.search}
        onSearch={(search) => update({ search })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={STATUS_ITEMS}
          value={filters.status ?? ALL}
          onValueChange={(value) => update({ status: value === ALL ? undefined : (value as AdminCompanyFilters['status']) })}
        >
          <SelectTrigger aria-label="Company Status" className="min-w-36">
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
        <DateRangeFilter
          label="Created Date"
          from={filters.created_from}
          to={filters.created_to}
          onChange={(from, to) => update({ created_from: from, created_to: to })}
        />
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
