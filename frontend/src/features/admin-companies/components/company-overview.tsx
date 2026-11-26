import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdminCompanyDetail } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

/** Overview tab: every field in PRD §4. */
export function CompanyOverview({ company }: { company: AdminCompanyDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Profile</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Item label="Name">{company.name}</Item>
            <Item label="Code">
              <span className="font-mono">{company.code}</span>
            </Item>
            <Item label="Legal Name">{company.legal_name ?? '—'}</Item>
            <Item label="Tax ID">{company.tax_id ?? '—'}</Item>
            <Item label="Email">
              <span className="break-all">{company.email ?? '—'}</span>
            </Item>
            <Item label="Phone">{company.phone ?? '—'}</Item>
            <Item label="Address" wide>
              <span className="whitespace-pre-line">{company.address ?? '—'}</span>
            </Item>
            <Item label="Timezone">{company.timezone}</Item>
            <Item label="Currency">{company.currency}</Item>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Ownership and History</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Item label="Owner">
              {company.owner ? (
                <Link to={`/admin/users/${company.owner.id}`} className="underline-offset-4 hover:underline">
                  {company.owner.name}
                </Link>
              ) : (
                '—'
              )}
              {company.owner && <span className="block truncate font-normal text-muted-foreground">{company.owner.email}</span>}
            </Item>
            <Item label="Created By">{company.created_by?.name ?? '—'}</Item>
            <Item label="Created At">{formatDateTime(company.created_at)}</Item>
            <Item label="Updated At">{formatDateTime(company.updated_at)}</Item>
            {company.status === 'suspended' && (
              <>
                <Item label="Suspended At">{formatDateTime(company.suspended_at)}</Item>
                <Item label="Suspension Reason" wide>
                  <span className="whitespace-pre-line">{company.suspension_reason ?? '—'}</span>
                </Item>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function Item({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-3' : 'flex min-w-0 flex-col gap-1'}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
