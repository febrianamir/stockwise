import { useId, type ComponentProps, type ReactNode } from 'react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface TextFieldProps extends Omit<ComponentProps<typeof Input>, 'id'> {
  label: string
  name: string
  error?: string
  description?: ReactNode
  /** Shown next to the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode
}

/** Label, input, helper text and error, wired together for screen readers. */
export function TextField({ label, name, error, description, labelAction, required, ...inputProps }: TextFieldProps) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>
          {label}
          {!required && <span className="font-normal text-muted-foreground">(Optional)</span>}
        </FieldLabel>
        {labelAction}
      </div>
      <Input
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        {...inputProps}
      />
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
