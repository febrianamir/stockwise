import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { ListPagination } from '@/components/list-pagination'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { adminCompanyQueries, type CompanyActivity as CompanyActivityEntry } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/company'
import { COMPANY_ACTIVITY_LABELS, FIELD_LABELS } from '../format'

/** Activity tab: the company's audit entries, newest first (PRD §6.3). */
export function CompanyActivity({ companyId }: { companyId: string }) {
  const [page, setPage] = useState(1)
  const { data, error, isPending, isFetching, refetch } = useQuery(adminCompanyQueries.activity(companyId, page))

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Couldn't load activity. {error.message}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Retry
          </Button>
        </AlertAction>
      </Alert>
    )
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (data.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4 border-l pl-4">
        {data.data.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{COMPANY_ACTIVITY_LABELS[entry.action]}</span>
            <span className="text-muted-foreground tabular-nums">
              {formatDateTime(entry.occurred_at)}
              {entry.actor && <> · by {entry.actor.name}</>}
            </span>
            {entry.member && <span className="text-muted-foreground">Member: {entry.member.name}</span>}
            <ActivityDetails entry={entry} />
          </li>
        ))}
      </ol>
      <ListPagination meta={data.meta} onPageChange={setPage} />
    </div>
  )
}

/** Role values are shown with their labels ("Admin"), everything else as stored. */
function formatValue(field: string, value: string | null): string {
  if (value === null || value === '') {
    return '—'
  }
  return field === 'role' ? (ROLE_LABELS[value as keyof typeof ROLE_LABELS] ?? value) : value
}

function ActivityDetails({ entry }: { entry: CompanyActivityEntry }) {
  const { changes, reason, note, role } = entry.metadata

  return (
    <>
      {reason && <p className="text-muted-foreground">Reason: {reason}</p>}
      {note && <p className="text-muted-foreground">Note: {note}</p>}
      {entry.action === 'company.member_added' && role && <p className="text-muted-foreground">Role: {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</p>}
      {changes && (
        <ul className="flex flex-col gap-0.5 text-muted-foreground">
          {Object.entries(changes).map(([field, change]) => (
            <li key={field}>
              {FIELD_LABELS[field] ?? field}: <span className="line-through">{formatValue(field, change.from)}</span> →{' '}
              <span className="text-foreground">{formatValue(field, change.to)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
