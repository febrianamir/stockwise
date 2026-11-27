import { ArrowLeft, Ban } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/** Shown instead of a company page when the API answers 403 `COMPANY_SUSPENDED` (CO-6, CW-1). */
export function CompanySuspendedNotice() {
  return (
    <div className="flex flex-col gap-6">
      <Link to="/companies" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Companies
      </Link>
      <Alert variant="destructive">
        <Ban aria-hidden="true" />
        <AlertTitle>This company is suspended</AlertTitle>
        <AlertDescription>You can't access it until a Stockwise administrator reactivates it.</AlertDescription>
      </Alert>
    </div>
  )
}
