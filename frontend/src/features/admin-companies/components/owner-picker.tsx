import { useQuery } from '@tanstack/react-query'
import { useDeferredValue, useId, useState } from 'react'
import { Link } from 'react-router'
import { UserAvatar } from '@/components/user-avatar'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { adminUserQueries, type AdminUser } from '@/lib/api'

interface OwnerPickerProps {
  value: AdminUser | null
  onChange: (user: AdminUser | null) => void
  error?: string
}

/**
 * Searches active users for the company owner (CM-4). Uses Platform User Management's list,
 * so new people are created there first (UM-7).
 */
export function OwnerPicker({ value, onChange, error }: OwnerPickerProps) {
  const id = useId()
  const [input, setInput] = useState('')
  const search = useDeferredValue(input.trim())
  const { data, isFetching } = useQuery(adminUserQueries.list({ search: search || undefined, status: 'active', per_page: 10, sort: 'name', direction: 'asc' }))
  const users = data?.data ?? []
  const descriptionId = `${id}-description`
  const errorId = error ? `${id}-error` : undefined

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Owner</FieldLabel>
      <Combobox
        items={users}
        value={value}
        onValueChange={(next) => onChange((next as AdminUser | null) ?? null)}
        onInputValueChange={setInput}
        itemToStringLabel={(user: AdminUser) => user.name}
        isItemEqualToValue={(a: AdminUser, b: AdminUser) => a.id === b.id}
        filter={null}
      >
        <ComboboxInput
          id={id}
          placeholder="Search active users by name, email or ID…"
          aria-invalid={error ? true : undefined}
          aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ')}
        />
        <ComboboxContent>
          <ComboboxEmpty>{isFetching ? 'Searching…' : 'No active users match.'}</ComboboxEmpty>
          <ComboboxList>
            {(user: AdminUser) => (
              <ComboboxItem key={user.id} value={user}>
                <UserAvatar name={user.name} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription id={descriptionId}>
        Only active, verified users can own a company. Need someone new?{' '}
        <Link to="/admin/users" className="font-medium text-primary underline-offset-4 hover:underline">
          Add them in Users
        </Link>{' '}
        first.
      </FieldDescription>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
