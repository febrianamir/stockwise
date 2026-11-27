import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { BranchStatusBadge, BranchTypeBadge } from '@/components/company-badges'
import { ListPagination } from '@/components/list-pagination'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { adminCompanyQueries } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/format'

/** Branches tab: read-only (CM-12). The company's Owner and Admins manage branches in their workspace (CM-15). */
export function CompanyBranches({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1)
  const { data, error, isPending, isFetching, refetch } = useQuery(adminCompanyQueries.branches(companyId, page))

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn't load branches. {error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (data && data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">This company has no branches yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">Read-only. The company's Owner and Admins manage branches in their workspace.</p>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending
              ? Array.from({ length: 3 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : data?.data.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="max-w-56 truncate font-medium">{branch.name}</TableCell>
                    <TableCell className="font-mono text-xs">{branch.code}</TableCell>
                    <TableCell>
                      <BranchTypeBadge type={branch.type} />
                    </TableCell>
                    <TableCell>
                      <BranchStatusBadge status={branch.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(branch.members_count ?? 0)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(branch.created_at)}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {data && <ListPagination meta={data.meta} onPageChange={setPage} />}
    </div>
  )
}
