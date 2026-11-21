import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isApiError } from '@/lib/api'

/**
 * Form-level error: anything that isn't a validation error on a rendered field,
 * such as 429s, network failures or server errors. Field errors render under their inputs.
 */
export function FormError({ error, fields = [] }: { error: unknown; fields?: string[] }) {
  if (!error) {
    return null
  }

  let message = 'Something went wrong. Please try again.'

  if (isApiError(error)) {
    if (error.isValidationError) {
      const unrendered = Object.entries(error.errors).filter(([field]) => !fields.includes(field))
      if (unrendered.length === 0) {
        return null
      }
      message = unrendered[0][1][0] ?? error.message
    } else {
      message = error.message
    }
  }

  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
