import { useId, type ReactNode } from 'react'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'

interface SearchableSelectProps {
  label: string
  /** Submitted with the form through a hidden input. */
  name: string
  options: readonly string[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  emptyText?: string
  error?: string
  description?: ReactNode
  required?: boolean
}

/** A labelled combobox over a long list of string options (timezones, currencies). */
export function SearchableSelect({
  label,
  name,
  options,
  value,
  onChange,
  placeholder,
  emptyText = 'No matches.',
  error,
  description,
  required,
}: SearchableSelectProps) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {!required && <span className="font-normal text-muted-foreground">(Optional)</span>}
      </FieldLabel>
      <Combobox items={options} value={value} onValueChange={(next) => onChange((next as string | null) ?? null)}>
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxList>
            {(option: string) => (
              <ComboboxItem key={option} value={option}>
                {option}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <input type="hidden" name={name} value={value ?? ''} />
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
