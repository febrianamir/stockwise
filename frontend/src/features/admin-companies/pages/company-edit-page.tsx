import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from '@/features/not-found-page'
import { adminCompanyQueries, type AdminCompanyDetail, type CompanyProfileInput } from '@/lib/api'
import { CompanyForm, type CompanyFormValues } from '@/components/company-form'
import { useUpdateCompany } from '../use-company-actions'

const EDITABLE: (keyof CompanyProfileInput)[] = ['name', 'legal_name', 'tax_id', 'email', 'phone', 'address', 'timezone', 'currency']

/** /admin/companies/:companyId/edit: PRD §6.4. Sends only changed fields plus `updated_at` (CM-11). */
export function CompanyEditPage() {
  const companyId = useParams().companyId ?? ''
  const { data: company, error, isPending, isFetching, refetch } = useQuery(adminCompanyQueries.detail(companyId))
  // Bumped only by "Reload", so a successful save (which updates the cache) doesn't remount the form.
  const [formVersion, setFormVersion] = useState(0)

  if (error?.status === 404) {
    return <NotFoundPage embedded />
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

  async function reload() {
    await refetch()
    setFormVersion((version) => version + 1)
  }

  return <EditForm key={formVersion} company={company} onReload={reload} />
}

function EditForm({ company, onReload }: { company: AdminCompanyDetail; onReload: () => void }) {
  const navigate = useNavigate()
  const mutation = useUpdateCompany(company.id)

  function handleSubmit(values: CompanyFormValues) {
    const changes: Partial<CompanyProfileInput> = {}
    for (const field of EDITABLE) {
      if ((values[field] ?? null) !== (company[field] ?? null)) {
        Object.assign(changes, { [field]: values[field] })
      }
    }
    mutation.mutate(
      { ...changes, updated_at: company.updated_at ?? '' },
      { onSuccess: () => navigate(`/admin/companies/${company.id}`) },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to={`/admin/companies/${company.id}`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {company.name}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Company</h1>
        <p className="text-sm text-muted-foreground">Changes are recorded in the company's activity log.</p>
      </div>
      <CompanyForm
        company={company}
        onSubmit={handleSubmit}
        isPending={mutation.isPending}
        error={mutation.error}
        submitLabel="Save Changes"
        cancelTo={`/admin/companies/${company.id}`}
        onReload={() => {
          mutation.reset()
          onReload()
        }}
      />
    </div>
  )
}
