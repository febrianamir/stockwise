import { useId, type ComponentProps, type ReactNode } from 'react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

interface TextareaFieldProps extends Omit<ComponentProps<typeof Textarea>, 'id'> {
  label: string
  name: string
  error?: string
  description?: ReactNode
}

/** Label, textarea, helper text and error, wired together like TextField. */
export function TextareaField({ label, name, error, description, required, ...textareaProps }: TextareaFieldProps) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {!required && <span className="font-normal text-muted-foreground">(Optional)</span>}
      </FieldLabel>
      <Textarea
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        {...textareaProps}
      />
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
