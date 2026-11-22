import { format, parseISO } from 'date-fns'
import { CalendarDays, Search, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminUserFilters } from '@/lib/api'
import { formatDay } from '../format'

const SEARCH_DEBOUNCE_MS = 300
const ALL = 'all'

const STATUS_ITEMS = [
  { value: ALL, label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
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
  const searchId = useId()
  const urlSearch = filters.search ?? ''
  const [search, setSearch] = useState(urlSearch)
  const [syncedSearch, setSyncedSearch] = useState(urlSearch)

  // The URL wins when it changes from outside the box ("Clear Filters" in the empty state, the
  // sidebar link, back/forward). Our own debounced write already matches what's typed, so it's kept.
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch)
    if (search.trim() !== urlSearch) {
      setSearch(urlSearch)
    }
  }

  // Debounce typing into the URL; skip when the URL already matches (e.g. after "Clear filters").
  useEffect(() => {
    if (search.trim() === (filters.search ?? '')) {
      return
    }
    const timeout = window.setTimeout(() => update({ search: search.trim() || undefined }), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [search, filters.search, update])


  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={searchId} className="sr-only">
          Search Users
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or user ID…"
            autoComplete="off"
            spellCheck={false}
            className="pl-8"
          />
        </div>
      </div>
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
        <RegistrationDateFilter
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

function toDateParam(date: Date | undefined): string | undefined {
  return date ? format(date, 'yyyy-MM-dd') : undefined
}

function RegistrationDateFilter({
  from,
  to,
  onChange,
}: {
  from?: string
  to?: string
  onChange: (from?: string, to?: string) => void
}) {
  const [today] = useState(() => new Date())
  const selected: DateRange | undefined = from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined
  const label = from ? (to && to !== from ? `${formatDay(from)} – ${formatDay(to)}` : formatDay(from)) : 'Registration Date'

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="font-normal" />}>
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        <span className={from ? undefined : 'text-muted-foreground'}>{label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <p className="px-1 text-sm font-medium">Registration Date</p>
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => onChange(toDateParam(range?.from), toDateParam(range?.to ?? range?.from))}
          disabled={{ after: today }}
          numberOfMonths={1}
        />
        {from && (
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined, undefined)}>
            Clear Dates
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
