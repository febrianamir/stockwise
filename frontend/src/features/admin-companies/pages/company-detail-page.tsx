import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Ban, Pencil, RefreshCw, RotateCcw, TriangleAlert, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NotFoundPage } from '@/features/not-found-page'
import { adminCompanyQueries, type AdminCompanyDetail } from '@/lib/api'
import { CompanyActivity } from '../components/company-activity'
import { CompanyBranches } from '../components/company-branches'
import { CompanyStatusBadge } from '@/components/company-badges'
import { CompanyMembers } from '../components/company-members'
import { CompanyOverview } from '../components/company-overview'
import { ReactivateCompanyDialog } from '../components/reactivate-company-dialog'
import { SuspendCompanyDialog } from '../components/suspend-company-dialog'
import { TransferOwnershipDialog } from '../components/transfer-ownership-dialog'

type Dialog = 'suspend' | 'reactivate' | 'transfer' | null

/** /admin/companies/:companyId: PRD §6.3 to §6.7. */
export function CompanyDetailPage() {
  const companyId = useParams().companyId ?? ''
  const { data: company, error, isPending, refetch, isFetching } = useQuery(adminCompanyQueries.detail(companyId))

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

  return <CompanyDetail company={company} />
}

function CompanyDetail({ company }: { company: AdminCompanyDetail }) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const close = () => setDialog(null)

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/companies" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All Companies
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{company.name}</h1>
            <CompanyStatusBadge status={company.status} />
          </div>
          <span className="font-mono text-sm text-muted-foreground">{company.code}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to={`/admin/companies/${company.id}/edit`} />} nativeButton={false}>
            <Pencil data-icon="inline-start" aria-hidden="true" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => setDialog('transfer')}>
            <UserRoundCog data-icon="inline-start" aria-hidden="true" />
            Transfer Ownership
          </Button>
          {company.status === 'active' ? (
            <Button variant="destructive" onClick={() => setDialog('suspend')}>
              <Ban data-icon="inline-start" aria-hidden="true" />
              Suspend
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setDialog('reactivate')}>
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {company.status === 'suspended' && (
        <Alert variant="destructive">
          <Ban aria-hidden="true" />
          <AlertTitle>This company is suspended</AlertTitle>
          <AlertDescription>Its members can't access it until it's reactivated. Reason: {company.suspension_reason}</AlertDescription>
        </Alert>
      )}

      {!company.owner_is_active && (
        <Alert>
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>No active owner</AlertTitle>
          <AlertDescription>The owner's account isn't active. Transfer ownership to an active member.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <CompanyOverview company={company} />
        </TabsContent>
        <TabsContent value="members" className="pt-4">
          <CompanyMembers companyId={company.id} />
        </TabsContent>
        <TabsContent value="branches" className="pt-4">
          <CompanyBranches companyId={company.id} />
        </TabsContent>
        <TabsContent value="activity" className="pt-4">
          <CompanyActivity companyId={company.id} />
        </TabsContent>
      </Tabs>

      <SuspendCompanyDialog company={company} open={dialog === 'suspend'} onClose={close} />
      <ReactivateCompanyDialog company={company} open={dialog === 'reactivate'} onClose={close} />
      <TransferOwnershipDialog company={company} open={dialog === 'transfer'} onClose={close} />
    </div>
  )
}
