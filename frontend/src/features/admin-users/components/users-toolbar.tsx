import { X } from 'lucide-react'
import { DateRangeFilter } from '@/components/date-range-filter'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminUserFilters } from '@/lib/api'

const ALL = 'all'

const STATUS_ITEMS = [
  { value: ALL, label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
]

const COMPANY_ITEMS = [
  { value: ALL, label: 'All Users' },
  { value: 'has', label: 'Has Company' },
  { value: 'none', label: 'No Company' },
]

const VERIFICATION_ITEMS = [
  { value: ALL, label: 'All Verification' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
]

interface UsersToolbarProps {
  filters: AdminUserFilters
  update: (patch: Partial<AdminUserFilters>) => void
  clear: () => void
  hasActiveFilters: boolean
}

/** Search and filters (PRD §6.1). */
export function UsersToolbar({ filters, update, clear, hasActiveFilters }: UsersToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <SearchInput
        label="Search Users"
        placeholder="Search by name, email or user ID…"
        value={filters.search}
        onSearch={(search) => update({ search })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={STATUS_ITEMS}
          value={filters.status ?? ALL}
          onValueChange={(value) => update({ status: value === ALL ? undefined : (value as AdminUserFilters['status']) })}
        >
          <SelectTrigger aria-label="Account Status" className="min-w-36">
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
          items={VERIFICATION_ITEMS}
          value={filters.verification ?? ALL}
          onValueChange={(value) =>
            update({ verification: value === ALL ? undefined : (value as AdminUserFilters['verification']) })
          }
        >
          <SelectTrigger aria-label="Email Verification" className="min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERIFICATION_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={COMPANY_ITEMS}
          value={filters.company ?? ALL}
          onValueChange={(value) => update({ company: value === ALL ? undefined : (value as AdminUserFilters['company']) })}
        >
          <SelectTrigger aria-label="Company Membership" className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFilter
          label="Registration Date"
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
