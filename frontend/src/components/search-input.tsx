import { Search } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DEBOUNCE_MS = 300

interface SearchInputProps {
  /** Accessible label (visually hidden). */
  label: string
  placeholder: string
  /** The applied search, usually from the URL. */
  value: string | undefined
  /** Called with the trimmed text (or `undefined` when empty) after typing pauses. */
  onSearch: (value: string | undefined) => void
}

/**
 * Debounced list search. Typing updates the applied value after a pause; when the applied value
 * changes from outside ("Clear Filters", navigation, back/forward), the box follows it.
 */
export function SearchInput({ label, placeholder, value, onSearch }: SearchInputProps) {
  const id = useId()
  const applied = value ?? ''
  const [text, setText] = useState(applied)
  const [synced, setSynced] = useState(applied)

  if (applied !== synced) {
    setSynced(applied)
    if (text.trim() !== applied) {
      setText(applied)
    }
  }

  useEffect(() => {
    if (text.trim() === applied) {
      return
    }
    const timeout = window.setTimeout(() => onSearch(text.trim() || undefined), DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [text, applied, onSearch])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="pl-8"
        />
      </div>
    </div>
  )
}
