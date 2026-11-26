import { RefreshCw } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { FormError } from '@/components/form-error'
import { SearchableSelect } from '@/components/searchable-select'
import { TextField } from '@/components/text-field'
import { TextareaField } from '@/components/textarea-field'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldGroup } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { isApiError, type AdminCompanyDetail, type AdminUser, type CompanyProfileInput } from '@/lib/api'
import { CURRENCIES, DEFAULT_CURRENCY, DEFAULT_TIMEZONE, TIMEZONES } from '@/lib/currencies'

export type CompanyFormValues = CompanyProfileInput & { code: string; owner: AdminUser | null }

/** The fields the form edits; both the platform and the workspace company shapes fit. */
export type EditableCompany = Pick<
  AdminCompanyDetail,
  'name' | 'code' | 'legal_name' | 'tax_id' | 'email' | 'phone' | 'address' | 'timezone' | 'currency'
>

interface CompanyFormProps {
  /** The company being edited; omit to create. */
  company?: EditableCompany
  onSubmit: (values: CompanyFormValues) => void
  isPending: boolean
  error: unknown
  submitLabel: string
  cancelTo: string
  /** Shown when an edit was rejected as stale (409 STALE_RECORD). */
  onReload?: () => void
  /** Renders the owner field when creating (the platform's owner picker). Omit when editing. */
  renderOwnerField?: (field: { value: AdminUser | null; onChange: (user: AdminUser | null) => void; error?: string }) => ReactNode
}

const PROFILE_FIELDS = ['name', 'code', 'legal_name', 'tax_id', 'email', 'phone', 'address', 'timezone', 'currency', 'owner_user_id']

function text(form: FormData, field: string): string | null {
  const value = String(form.get(field) ?? '').trim()
  return value === '' ? null : value
}

/**
 * Company create and edit form, grouped as in company-management PRD §6.2, shared by the
 * platform and the company workspace (CW-2). Code is set on create only (CM-8); the owner field
 * is rendered by the caller on create.
 */
export function CompanyForm({ company, onSubmit, isPending, error, submitLabel, cancelTo, onReload, renderOwnerField }: CompanyFormProps) {
  const isEdit = company !== undefined
  const [timezone, setTimezone] = useState<string | null>(company?.timezone ?? DEFAULT_TIMEZONE)
  const [currency, setCurrency] = useState<string | null>(company?.currency ?? DEFAULT_CURRENCY)
  const [owner, setOwner] = useState<AdminUser | null>(null)
  const isStale = isApiError(error) && error.code === 'STALE_RECORD'
  const fieldError = (field: string) => (isApiError(error) ? error.fieldError(field) : undefined)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onSubmit({
      name: String(form.get('name') ?? '').trim(),
      code: String(form.get('code') ?? company?.code ?? '').trim(),
      legal_name: text(form, 'legal_name'),
      tax_id: text(form, 'tax_id'),
      email: text(form, 'email'),
      phone: text(form, 'phone'),
      address: text(form, 'address'),
      timezone: timezone ?? '',
      currency: currency ?? '',
      owner,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {isStale ? (
        <Alert variant="destructive">
          <AlertDescription>Someone else changed this company while you were editing. Reload it to see the latest details, then make your changes again.</AlertDescription>
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
        <FormError error={error} fields={PROFILE_FIELDS} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Company Details</h2>
          </CardTitle>
          <CardDescription>How the business is identified on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <TextField label="Name" name="name" required defaultValue={company?.name} autoComplete="off" error={fieldError('name')} />
            <TextField
              label="Code"
              name="code"
              required
              defaultValue={company?.code}
              readOnly={isEdit}
              disabled={isEdit}
              autoComplete="off"
              spellCheck={false}
              description={
                isEdit
                  ? "The code can't be changed after creation."
                  : 'Lowercase letters, numbers and hyphens, starting with a letter (e.g. toko-sejahtera). It can\'t be changed later.'
              }
              error={fieldError('code')}
            />
            <TextField label="Legal Name" name="legal_name" defaultValue={company?.legal_name ?? ''} autoComplete="off" error={fieldError('legal_name')} />
            <TextField label="Tax ID" name="tax_id" defaultValue={company?.tax_id ?? ''} autoComplete="off" description="For example, NPWP." error={fieldError('tax_id')} />
            <TextField label="Email" name="email" type="email" defaultValue={company?.email ?? ''} autoComplete="off" spellCheck={false} error={fieldError('email')} />
            <TextField label="Phone" name="phone" type="tel" defaultValue={company?.phone ?? ''} autoComplete="off" error={fieldError('phone')} />
            <div className="md:col-span-2">
              <TextareaField label="Address" name="address" defaultValue={company?.address ?? ''} rows={3} maxLength={500} error={fieldError('address')} />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Business Settings</h2>
          </CardTitle>
          <CardDescription>The timezone sets business-day boundaries in reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 md:grid-cols-2">
            <SearchableSelect
              label="Timezone"
              name="timezone"
              required
              options={TIMEZONES}
              value={timezone}
              onChange={setTimezone}
              placeholder="Search timezones…"
              error={fieldError('timezone')}
            />
            <SearchableSelect
              label="Currency"
              name="currency"
              required
              options={CURRENCIES}
              value={currency}
              onChange={setCurrency}
              placeholder="Search currencies…"
              description="ISO 4217 code."
              error={fieldError('currency')}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {renderOwnerField && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Owner</h2>
            </CardTitle>
            <CardDescription>Every company has exactly one owner, who has full access to it.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="max-w-md">
              {renderOwnerField({ value: owner, onChange: setOwner, error: fieldError('owner_user_id') })}
            </FieldGroup>
          </CardContent>
        </Card>
      )}

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
