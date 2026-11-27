import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Ban, Pencil, RotateCcw } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { BranchStatusBadge, BranchTypeBadge } from '@/components/company-badges'
import { PageLoading } from '@/components/page-status'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { canInCompany } from '@/features/companies/permissions'
import { branchQueries, companyQueries, type Branch, type Company } from '@/lib/api'
import { BRANCH_TYPE_LABELS } from '@/lib/branch'
import { formatDate, formatDateTime } from '@/lib/format'
import { BranchLoadError } from '../components/branch-load-error'
import { BranchMembersSection } from '../components/branch-members-section'
import { DeactivateBranchDialog, ReactivateBranchDialog } from '../components/branch-status-dialogs'

/** /companies/:companyId/branches/:branchId: branch-management PRD §8.3. */
export function BranchDetailPage() {
  const { companyId = '', branchId = '' } = useParams()
  const company = useQuery(companyQueries.detail(companyId))
  const branch = useQuery(branchQueries.detail(companyId, branchId))

  const error = (company.data ? null : company.error) ?? (branch.data ? null : branch.error)
  if (error) {
    return (
      <BranchLoadError
        error={error}
        companyId={companyId}
        subject="this branch"
        onRetry={() => (company.error ? company.refetch() : branch.refetch())}
        isRetrying={company.isFetching || branch.isFetching}
      />
    )
  }

  if (!company.data || !branch.data) {
    return <PageLoading label="Loading branch…" />
  }

  return <BranchView company={company.data} branch={branch.data} />
}

function BranchView({ company, branch }: { company: Company; branch: Branch }) {
  const [dialog, setDialog] = useState<'deactivate' | 'reactivate' | null>(null)
  const canManage = canInCompany(company, 'manage-branches')
  const isActive = branch.status === 'active'

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/companies/${company.id}/branches`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Branches
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{branch.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{branch.code}</span>
            <BranchTypeBadge type={branch.type} />
            <BranchStatusBadge status={branch.status} />
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link to={`/companies/${company.id}/branches/${branch.id}/edit`} />} nativeButton={false}>
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Edit Branch
            </Button>
            {isActive ? (
              <Button variant="outline" className="text-destructive" onClick={() => setDialog('deactivate')}>
                <Ban data-icon="inline-start" aria-hidden="true" />
                Deactivate
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDialog('reactivate')}>
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Reactivate
              </Button>
            )}
          </div>
        )}
      </div>

      {!isActive && (
        <Alert variant="destructive">
          <Ban aria-hidden="true" />
          <AlertTitle>This branch is inactive</AlertTitle>
          <AlertDescription>
            <p>
              Deactivated {formatDateTime(branch.deactivated_at)}. Sales and stock changes are blocked; history stays readable.
            </p>
            {branch.deactivation_reason && <p>Reason: {branch.deactivation_reason}</p>}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Profile</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Item label="Name">{branch.name}</Item>
            <Item label="Code">
              <span className="font-mono">{branch.code}</span>
            </Item>
            <Item label="Type">{BRANCH_TYPE_LABELS[branch.type]}</Item>
            <Item label="Phone">{branch.phone ?? '—'}</Item>
            <Item label="Timezone">{branch.timezone ?? `${company.timezone} (company)`}</Item>
            <Item label="Created At">{formatDate(branch.created_at)}</Item>
            <Item label="Address" wide>
              <span className="whitespace-pre-line">{branch.address ?? '—'}</span>
            </Item>
          </dl>
        </CardContent>
      </Card>

      <BranchMembersSection companyId={company.id} branchId={branch.id} canManageAccess={canInCompany(company, 'manage-branch-access')} />

      {canManage && (
        <>
          <DeactivateBranchDialog companyId={company.id} branch={branch} open={dialog === 'deactivate'} onClose={() => setDialog(null)} />
          <ReactivateBranchDialog companyId={company.id} branch={branch} open={dialog === 'reactivate'} onClose={() => setDialog(null)} />
        </>
      )}
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
