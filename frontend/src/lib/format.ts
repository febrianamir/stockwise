import { parseISO } from 'date-fns'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const numberFormat = new Intl.NumberFormat()

/** "Febrian Amir" → "FA" */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)

  return letters.toUpperCase()
}

/** An ISO timestamp as a date, e.g. "Nov 26, 2026". */
export function formatDate(value: string | null): string {
  return value ? dateFormat.format(new Date(value)) : '—'
}

/** A `YYYY-MM-DD` calendar day, read as a local date (not UTC midnight, which can show the day before). */
export function formatDay(value: string): string {
  return dateFormat.format(parseISO(value))
}

/** An ISO timestamp as date and time. */
export function formatDateTime(value: string | null): string {
  return value ? dateTimeFormat.format(new Date(value)) : '—'
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}
