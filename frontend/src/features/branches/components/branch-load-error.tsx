import { ArrowLeft, Lock, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CompanySuspendedNotice } from '@/features/companies/components/company-suspended-notice'
import { NotFoundPage } from '@/features/not-found-page'
import type { ApiError } from '@/lib/api'

interface BranchLoadErrorProps {
  error: ApiError
  companyId: string
  /** What failed to load, for the generic message: "this branch", "branches". */
  subject: string
  onRetry: () => void
  isRetrying: boolean
}

/**
 * Page-level errors for branch screens (branch-management PRD §8): unknown or another company's
 * branch (404), no access to the branch (403 `BRANCH_ACCESS_DENIED`), a suspended company, or
 * anything else with a retry.
 */
export function BranchLoadError({ error, companyId, subject, onRetry, isRetrying }: BranchLoadErrorProps) {
  if (error.status === 404) {
    return <NotFoundPage embedded />
  }

  if (error.code === 'COMPANY_SUSPENDED') {
    return <CompanySuspendedNotice />
  }

  if (error.code === 'BRANCH_ACCESS_DENIED') {
    return (
      <div className="flex flex-col gap-6">
        <Link
          to={`/companies/${companyId}/branches`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Branches
        </Link>
        <Alert>
          <Lock aria-hidden="true" />
          <AlertTitle>You don't have access to this branch</AlertTitle>
          <AlertDescription>Ask the company's Owner or an Admin to give you access if you need to work in it.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <Alert variant="destructive">
      <AlertDescription>
        Couldn't load {subject}. {error.message}
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          Retry
        </Button>
      </AlertAction>
    </Alert>
  )
}
