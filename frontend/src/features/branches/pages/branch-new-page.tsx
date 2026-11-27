import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { canInCompany } from '@/features/companies/permissions'
import { companyQueries } from '@/lib/api'
import { BranchForm } from '../components/branch-form'
import { BranchLoadError } from '../components/branch-load-error'
import { useCreateBranch } from '../use-branch-actions'

/** /companies/:companyId/branches/new: `manage-branches` (branch-management PRD §8.2). */
export function BranchNewPage() {
  const companyId = useParams().companyId ?? ''
  const navigate = useNavigate()
  const { data: company, error, isPending, isFetching, refetch } = useQuery(companyQueries.detail(companyId))
  const mutation = useCreateBranch(companyId)

  if (error && !company) {
    return <BranchLoadError error={error} companyId={companyId} subject="this company" onRetry={() => refetch()} isRetrying={isFetching} />
  }

  if (isPending) {
    return <PageLoading label="Loading company…" />
  }

  // Without the permission there's nothing to create; the API would refuse anyway (SEC-2).
  if (!canInCompany(company, 'manage-branches')) {
    return <Navigate to={`/companies/${companyId}/branches`} replace />
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/companies/${companyId}/branches`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Branches
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Add Branch</h1>
        <p className="text-sm text-muted-foreground">Add a store or warehouse to {company.name}.</p>
      </div>
      <BranchForm
        companyTimezone={company.timezone}
        onSubmit={(values) => mutation.mutate(values, { onSuccess: (branch) => navigate(`/companies/${companyId}/branches/${branch.id}`) })}
        isPending={mutation.isPending}
        error={mutation.error}
        submitLabel="Add Branch"
        cancelTo={`/companies/${companyId}/branches`}
      />
    </div>
  )
}
