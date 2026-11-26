import type { ReactNode } from 'react'
import { FormError } from '@/components/form-error'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  isPending: boolean
  error?: unknown
  destructive?: boolean
  /** Form fields shown under the description, e.g. a reason or a type-to-confirm input. */
  children?: ReactNode
  /** Keeps the confirm button disabled, e.g. until required input is valid. */
  confirmDisabled?: boolean
  /** Field names rendered in `children`, so their 422 errors aren't repeated in the alert. */
  fields?: string[]
}

/**
 * Confirmation for important or destructive actions (ui-guidelines §7, §9). Stays open while the
 * action runs and shows its error; the caller closes it on success.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
  error,
  destructive = false,
  children,
  confirmDisabled = false,
  fields,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription render={<div />}>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <FormError error={error} fields={fields} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={isPending || confirmDisabled}>
            {isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
