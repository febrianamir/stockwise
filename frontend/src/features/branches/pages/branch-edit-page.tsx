import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { canInCompany } from '@/features/companies/permissions'
import { branchQueries, companyQueries, type Branch, type BranchEditInput, type BranchInput } from '@/lib/api'
import { BranchForm } from '../components/branch-form'
import { BranchLoadError } from '../components/branch-load-error'
import { useUpdateBranch } from '../use-branch-actions'

const EDITABLE: (keyof Omit<BranchInput, 'code'>)[] = ['name', 'type', 'address', 'phone', 'timezone']

/** /companies/:companyId/branches/:branchId/edit: `manage-branches`. Sends only changed fields plus `updated_at`. */
export function BranchEditPage() {
  const { companyId = '', branchId = '' } = useParams()
  const company = useQuery(companyQueries.detail(companyId))
  const branch = useQuery(branchQueries.detail(companyId, branchId))
  const [formVersion, setFormVersion] = useState(0)

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

  if (!canInCompany(company.data, 'manage-branches')) {
    return <Navigate to={`/companies/${companyId}/branches/${branchId}`} replace />
  }

  async function reload() {
    await branch.refetch()
    setFormVersion((version) => version + 1)
  }

  return <EditForm key={formVersion} companyId={companyId} companyTimezone={company.data.timezone} branch={branch.data} onReload={reload} />
}

function EditForm({ companyId, companyTimezone, branch, onReload }: { companyId: string; companyTimezone: string; branch: Branch; onReload: () => void }) {
  const navigate = useNavigate()
  const mutation = useUpdateBranch(companyId, branch.id)
  const detailUrl = `/companies/${companyId}/branches/${branch.id}`

  function handleSubmit(values: BranchInput) {
    const changes: Partial<BranchEditInput> = {}
    for (const field of EDITABLE) {
      if ((values[field] ?? null) !== (branch[field] ?? null)) {
        Object.assign(changes, { [field]: values[field] })
      }
    }
    mutation.mutate({ ...changes, updated_at: branch.updated_at ?? '' }, { onSuccess: () => navigate(detailUrl) })
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to={detailUrl} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {branch.name}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Branch</h1>
        <p className="text-sm text-muted-foreground">Update this branch's details and settings.</p>
      </div>
      <BranchForm
        branch={branch}
        companyTimezone={companyTimezone}
        onSubmit={handleSubmit}
        isPending={mutation.isPending}
        error={mutation.error}
        submitLabel="Save Changes"
        cancelTo={detailUrl}
        onReload={() => {
          mutation.reset()
          onReload()
        }}
      />
    </div>
  )
}
