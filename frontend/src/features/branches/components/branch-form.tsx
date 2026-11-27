import { RefreshCw } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { FormError } from '@/components/form-error'
import { SearchableSelect } from '@/components/searchable-select'
import { TextField } from '@/components/text-field'
import { TextareaField } from '@/components/textarea-field'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { isApiError, type Branch, type BranchInput, type BranchType } from '@/lib/api'
import { BRANCH_TYPE_LABELS } from '@/lib/branch'
import { TIMEZONES } from '@/lib/currencies'

const FIELDS = ['name', 'code', 'type', 'address', 'phone', 'timezone']

const TYPE_ITEMS = (Object.keys(BRANCH_TYPE_LABELS) as BranchType[]).map((value) => ({ value, label: BRANCH_TYPE_LABELS[value] }))

interface BranchFormProps {
  /** The branch being edited; omit to create. */
  branch?: Branch
  /** Shown as the default when the branch has no timezone of its own (BM-9). */
  companyTimezone: string
  onSubmit: (values: BranchInput) => void
  isPending: boolean
  error: unknown
  submitLabel: string
  cancelTo: string
  /** Shown when an edit was rejected as stale (409 STALE_RECORD). */
  onReload?: () => void
}

function text(form: FormData, field: string): string | null {
  const value = String(form.get(field) ?? '').trim()
  return value === '' ? null : value
}

/** Create and edit form for a branch (branch-management PRD §5). The code is set on create only (BM-2). */
export function BranchForm({ branch, companyTimezone, onSubmit, isPending, error, submitLabel, cancelTo, onReload }: BranchFormProps) {
  const isEdit = branch !== undefined
  const typeId = useId()
  const [type, setType] = useState<BranchType>(branch?.type ?? 'store')
  const [timezone, setTimezone] = useState<string | null>(branch?.timezone ?? null)
  const isStale = isApiError(error) && error.code === 'STALE_RECORD'
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      name: String(form.get('name') ?? '').trim(),
      code: String(form.get('code') ?? branch?.code ?? '')
        .trim()
        .toUpperCase(),
      type,
      address: text(form, 'address'),
      phone: text(form, 'phone'),
      timezone,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {isStale ? (
        <Alert variant="destructive">
          <AlertDescription>Someone else changed this branch while you were editing. Reload it to see the latest details, then make your changes again.</AlertDescription>
          {onReload && (
            <AlertAction>
              <Button type="button" variant="outline" size="sm" onClick={onReload}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                Reload
              </Button>
            </AlertAction>
          )}
        </Alert>
      ) : (
        <FormError error={error} fields={FIELDS} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Branch Details</h2>
          </CardTitle>
          <CardDescription>How the location is named and identified.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <TextField label="Name" name="name" required defaultValue={branch?.name} autoComplete="off" maxLength={100} error={fieldError('name')} />
            <TextField
              label="Code"
              name="code"
              required
              defaultValue={branch?.code}
              readOnly={isEdit}
              disabled={isEdit}
              autoComplete="off"
              spellCheck={false}
              maxLength={20}
              className="font-mono uppercase"
              description={
                isEdit
                  ? "The code can't be changed after creation."
                  : "Letters, numbers and hyphens (e.g. MKS). Used in document numbers, so it can't be changed later."
              }
              error={fieldError('code')}
            />
            <Field data-invalid={fieldError('type') ? true : undefined}>
              <FieldLabel htmlFor={typeId}>Type</FieldLabel>
              <Select items={TYPE_ITEMS} value={type} onValueChange={(value) => setType(value as BranchType)}>
                <SelectTrigger id={typeId} className="w-full" aria-describedby={`${typeId}-description`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription id={`${typeId}-description`}>A store serves customers; a warehouse stores stock and supplies other locations.</FieldDescription>
            </Field>
            <TextField label="Phone" name="phone" type="tel" defaultValue={branch?.phone ?? ''} autoComplete="off" maxLength={30} error={fieldError('phone')} />
            <div className="md:col-span-2">
              <TextareaField label="Address" name="address" defaultValue={branch?.address ?? ''} rows={3} maxLength={500} error={fieldError('address')} />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Business Settings</h2>
          </CardTitle>
          <CardDescription>The timezone sets this branch's business-day boundaries in reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-md">
            <SearchableSelect
              label="Timezone"
              name="timezone"
              options={TIMEZONES}
              value={timezone}
              onChange={setTimezone}
              placeholder={`Company timezone (${companyTimezone})`}
              description={
                timezone ? (
                  <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setTimezone(null)}>
                    Use the company's timezone ({companyTimezone})
                  </Button>
                ) : (
                  `Leave empty to use the company's timezone (${companyTimezone}).`
                )
              }
              error={fieldError('timezone')}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" render={<Link to={cancelTo} />} nativeButton={false}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || isStale}>
          {isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
