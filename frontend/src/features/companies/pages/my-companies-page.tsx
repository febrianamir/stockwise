import { MyCompaniesList } from '../components/my-companies-list'

/** /companies: docs/features/company-workspace/prd.md §5.1. */
export function MyCompaniesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">My Companies</h1>
        <p className="text-sm text-muted-foreground">The businesses you work in, and your role in each.</p>
      </div>
      <MyCompaniesList />
    </div>
  )
}
