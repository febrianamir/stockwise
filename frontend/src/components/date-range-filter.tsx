import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDay } from '@/lib/format'

function toDateParam(date: Date | undefined): string | undefined {
  return date ? format(date, 'yyyy-MM-dd') : undefined
}

interface DateRangeFilterProps {
  /** Shown on the button when no range is set, and as the popover title. */
  label: string
  /** `YYYY-MM-DD`, inclusive */
  from?: string
  /** `YYYY-MM-DD`, inclusive */
  to?: string
  onChange: (from?: string, to?: string) => void
}

/** A calendar-day range filter for list toolbars; future days are disabled. */
export function DateRangeFilter({ label, from, to, onChange }: DateRangeFilterProps) {
  const [today] = useState(() => new Date())
  const selected: DateRange | undefined = from ? { from: parseISO(from), to: to ? parseISO(to) : undefined } : undefined
  const buttonLabel = from ? (to && to !== from ? `${formatDay(from)} – ${formatDay(to)}` : formatDay(from)) : label

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className="font-normal" />}>
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        <span className={from ? undefined : 'text-muted-foreground'}>{buttonLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <p className="px-1 text-sm font-medium">{label}</p>
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
