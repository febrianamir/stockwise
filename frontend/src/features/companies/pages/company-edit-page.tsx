import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CompanyForm, type CompanyFormValues } from '@/components/company-form'
import { NotFoundPage } from '@/features/not-found-page'
import { companyQueries, type Company, type CompanyProfileInput } from '@/lib/api'
import { canInCompany } from '../permissions'
import { useUpdateCompanyProfile } from '../use-company-actions'

const EDITABLE: (keyof CompanyProfileInput)[] = ['name', 'legal_name', 'tax_id', 'email', 'phone', 'address', 'timezone', 'currency']

/** /companies/:companyId/edit: Owners and Admins (CW-2). Sends only changed fields plus `updated_at` (CW-7). */
export function CompanyEditPage() {
  const companyId = useParams().companyId ?? ''
  const { data: company, error, isPending, isFetching, refetch } = useQuery(companyQueries.detail(companyId))
  const [formVersion, setFormVersion] = useState(0)

  if (error?.status === 404) {
    return <NotFoundPage embedded />
  }

  if (error?.code === 'COMPANY_SUSPENDED') {
    return <Navigate to={`/companies/${companyId}`} replace />
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

  // Without the permission there's nothing to edit; the API would refuse anyway (SEC-2).
  if (!canInCompany(company, 'manage-company')) {
    return <Navigate to={`/companies/${company.id}`} replace />
  }

  async function reload() {
    await refetch()
    setFormVersion((version) => version + 1)
  }

  return <EditForm key={formVersion} company={company} onReload={reload} />
}

function EditForm({ company, onReload }: { company: Company; onReload: () => void }) {
  const navigate = useNavigate()
  const mutation = useUpdateCompanyProfile(company.id)

  function handleSubmit(values: CompanyFormValues) {
    const changes: Partial<CompanyProfileInput> = {}
    for (const field of EDITABLE) {
      if ((values[field] ?? null) !== (company[field] ?? null)) {
        Object.assign(changes, { [field]: values[field] })
      }
    }
    mutation.mutate({ ...changes, updated_at: company.updated_at ?? '' }, { onSuccess: () => navigate(`/companies/${company.id}`) })
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/companies/${company.id}`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {company.name}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Company</h1>
        <p className="text-sm text-muted-foreground">Update your company's details and settings.</p>
      </div>
      <CompanyForm
        company={company}
        onSubmit={handleSubmit}
        isPending={mutation.isPending}
        error={mutation.error}
        submitLabel="Save Changes"
        cancelTo={`/companies/${company.id}`}
        onReload={() => {
          mutation.reset()
          onReload()
        }}
      />
    </div>
  )
}
