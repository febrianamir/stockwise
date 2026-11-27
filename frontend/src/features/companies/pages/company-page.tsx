import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OwnerBadge } from '@/components/company-badges'
import { ROLE_LABELS } from '@/lib/company'
import { NotFoundPage } from '@/features/not-found-page'
import { companyQueries, type Company } from '@/lib/api'
import { CompanyBranchesSection } from '../components/company-branches-section'
import { CompanyMembersSection } from '../components/company-members-section'
import { CompanySuspendedNotice } from '../components/company-suspended-notice'
import { canInCompany } from '../permissions'

/** /companies/:companyId: docs/features/company-workspace/prd.md §5.2. */
export function CompanyPage() {
  const companyId = useParams().companyId ?? ''
  const { data: company, error, isPending, isFetching, refetch } = useQuery(companyQueries.detail(companyId))

  if (error?.status === 404) {
    return <NotFoundPage embedded />
  }

  if (error?.code === 'COMPANY_SUSPENDED') {
    return <CompanySuspendedNotice />
  }

  if (error && !company) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn't load this company. {error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (isPending || !company) {
    return <PageLoading label="Loading company…" />
  }

  return <CompanyView company={company} />
}

function CompanyView({ company }: { company: Company }) {
  return (
    <div className="flex flex-col gap-6">
      <Link to="/companies" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Companies
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{company.code}</span>
            <span aria-hidden="true">·</span>
            {company.membership.is_owner ? <OwnerBadge /> : <span>Your role: {ROLE_LABELS[company.membership.role]}</span>}
          </div>
        </div>
        {canInCompany(company, 'manage-company') && (
          <Button variant="outline" render={<Link to={`/companies/${company.id}/edit`} />} nativeButton={false}>
            <Pencil data-icon="inline-start" aria-hidden="true" />
            Edit Company
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Profile</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Item label="Name">{company.name}</Item>
            <Item label="Legal Name">{company.legal_name ?? '—'}</Item>
            <Item label="Tax ID">{company.tax_id ?? '—'}</Item>
            <Item label="Email">
              <span className="break-all">{company.email ?? '—'}</span>
            </Item>
            <Item label="Phone">{company.phone ?? '—'}</Item>
            <Item label="Owner">{company.owner?.name ?? '—'}</Item>
            <Item label="Address" wide>
              <span className="whitespace-pre-line">{company.address ?? '—'}</span>
            </Item>
            <Item label="Timezone">{company.timezone}</Item>
            <Item label="Currency">{company.currency}</Item>
          </dl>
        </CardContent>
      </Card>

      {canInCompany(company, 'view-branches') && <CompanyBranchesSection company={company} />}

      <CompanyMembersSection company={company} />
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
