import { useId } from 'react'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export const CODE_LENGTH = 6

interface CodeFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
  description?: string
  disabled?: boolean
}

/** 6-digit one-time code input (AUTH-4). */
export function CodeField({ value, onChange, error, description, disabled }: CodeFieldProps) {
  const id = useId()
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Verification code</FieldLabel>
      <InputOTP
        id={id}
        name="code"
        maxLength={CODE_LENGTH}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      >
        <InputOTPGroup>
          {Array.from({ length: CODE_LENGTH }, (_, index) => (
            <InputOTPSlot key={index} index={index} aria-invalid={error ? true : undefined} className="size-10 text-base tabular-nums" />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
