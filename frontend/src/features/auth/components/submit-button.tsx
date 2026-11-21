import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

/** Full-width primary submit button with a pending state (PRD §9). */
export function SubmitButton({ isPending, children, disabled }: { isPending: boolean; children: ReactNode; disabled?: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={isPending || disabled}>
      {isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {children}
    </Button>
  )
}
