import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { OwnerPicker } from '../components/owner-picker'
import { useCreateCompany } from '../use-company-actions'
import { CompanyForm, type CompanyFormValues } from '@/components/company-form'

/** /admin/companies/new: PRD §6.2. */
export function CompanyNewPage() {
  const navigate = useNavigate()
  const mutation = useCreateCompany()

  function handleSubmit({ owner, ...values }: CompanyFormValues) {
    mutation.mutate(
      { ...values, owner_user_id: owner?.id ?? null },
      { onSuccess: (company) => navigate(`/admin/companies/${company.id}`, { replace: true }) },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/companies" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All Companies
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New Company</h1>
        <p className="text-sm text-muted-foreground">Create a business on Stockwise and assign its owner.</p>
      </div>
      <CompanyForm
        onSubmit={handleSubmit}
        isPending={mutation.isPending}
        error={mutation.error}
        submitLabel="Create Company"
        cancelTo="/admin/companies"
        renderOwnerField={(field) => <OwnerPicker {...field} />}
      />
    </div>
  )
}
