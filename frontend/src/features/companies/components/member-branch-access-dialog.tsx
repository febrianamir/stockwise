import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { BranchStatusBadge } from '@/components/company-badges'
import { FormError } from '@/components/form-error'
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateBranchAccess } from '@/features/branches/use-branch-actions'
import { branchQueries, type BranchAccess, type BranchFilters, type BranchScope, type BranchSummary, type CompanyMember } from '@/lib/api'

/** Every branch the editor can see, for the checklist. 100 is the API's page maximum. */
const ALL_BRANCHES: BranchFilters = { sort: 'name', direction: 'asc', per_page: 100 }

interface MemberBranchAccessDialogProps {
  companyId: string
  /** The member being edited; null keeps the dialog closed. */
  member: CompanyMember | null
  onClose: () => void
}

/** Choose all branches or a list of branches for a member (branch-management PRD §8.4, BM-3 to BM-5). */
export function MemberBranchAccessDialog({ companyId, member, onClose }: MemberBranchAccessDialogProps) {
  const open = member !== null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {member && <AccessEditor key={member.id} companyId={companyId} member={member} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function AccessEditor({ companyId, member, onClose }: { companyId: string; member: CompanyMember; onClose: () => void }) {
  const access = useQuery(branchQueries.memberAccess(companyId, member.id))
  const branches = useQuery(branchQueries.list(companyId, ALL_BRANCHES))
  const failed = (access.error && !access.data) || (branches.error && !branches.data)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Branch Access</DialogTitle>
        <DialogDescription>Choose where {member.user.name} can work. Changes apply on their next request.</DialogDescription>
      </DialogHeader>
      {failed ? (
        <Alert variant="destructive">
          <AlertDescription>Couldn't load branch access. {(access.error ?? branches.error)?.message}</AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              size="sm"
              onClick={() => Promise.all([access.refetch(), branches.refetch()])}
              disabled={access.isFetching || branches.isFetching}
            >
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Retry
            </Button>
          </AlertAction>
        </Alert>
      ) : access.data && branches.data ? (
        <AccessForm companyId={companyId} member={member} access={access.data} branches={branches.data.data} onClose={onClose} />
      ) : (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </>
  )
}

function AccessForm({
  companyId,
  member,
  access,
  branches,
  onClose,
}: {
  companyId: string
  member: CompanyMember
  access: BranchAccess
  branches: BranchSummary[]
  onClose: () => void
}) {
  const id = useId()
  const mutation = useUpdateBranchAccess(companyId)
  const [scope, setScope] = useState<BranchScope>(access.scope)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(access.branches.map((branch) => branch.id)))

  // Keep current grants listed even if the editor can't see those branches, so saving doesn't drop them.
  const options = useMemo(() => {
    const byId = new Map(branches.map((branch) => [branch.id, branch]))
    for (const branch of access.branches) {
      byId.set(branch.id, branch)
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [branches, access.branches])

  const needsBranch = scope === 'selected' && selected.size === 0
  const branchError = mutation.error?.fieldError('branch_ids') ?? mutation.error?.fieldError('branch_ids.0')

  function toggle(branchId: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (checked) {
        next.add(branchId)
      } else {
        next.delete(branchId)
      }
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate(
      { member, input: scope === 'all' ? { scope } : { scope, branch_ids: [...selected] } },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <FormError error={mutation.error} fields={['scope', 'branch_ids', 'branch_ids.0']} />
        <FieldSet>
          <FieldLegend variant="label">Access</FieldLegend>
          <RadioGroup value={scope} onValueChange={(value) => setScope(value as BranchScope)}>
            <Field orientation="horizontal">
              <RadioGroupItem value="all" id={`${id}-all`} />
              <FieldContent>
                <FieldLabel htmlFor={`${id}-all`}>All Branches</FieldLabel>
                <FieldDescription>Every branch, including ones added later.</FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="selected" id={`${id}-selected`} />
              <FieldContent>
                <FieldLabel htmlFor={`${id}-selected`}>Selected Branches</FieldLabel>
                <FieldDescription>Only the branches you choose below.</FieldDescription>
              </FieldContent>
            </Field>
          </RadioGroup>
          {mutation.error?.fieldError('scope') && <FieldError>{mutation.error.fieldError('scope')}</FieldError>}
        </FieldSet>

        {scope === 'selected' && (
          <FieldSet data-invalid={branchError ? true : undefined}>
            <FieldLegend variant="label">Branches</FieldLegend>
            {options.length === 0 ? (
              <FieldDescription>This company has no branches yet. Add a branch first, or give access to all branches.</FieldDescription>
            ) : (
              <div className="flex max-h-64 flex-col gap-3 overflow-y-auto rounded-lg border p-3">
                {options.map((branch) => (
                  <Field key={branch.id} orientation="horizontal">
                    <Checkbox
                      id={`${id}-${branch.id}`}
                      checked={selected.has(branch.id)}
                      onCheckedChange={(checked) => toggle(branch.id, checked === true)}
                    />
                    <FieldLabel htmlFor={`${id}-${branch.id}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-normal">
                      <span className="truncate">{branch.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{branch.code}</span>
                      {branch.status === 'inactive' && <BranchStatusBadge status={branch.status} />}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            )}
            {branchError ? <FieldError>{branchError}</FieldError> : needsBranch && <FieldDescription>Choose at least one branch.</FieldDescription>}
          </FieldSet>
        )}
      </FieldGroup>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />} disabled={mutation.isPending}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={mutation.isPending || needsBranch}>
          {mutation.isPending && <Spinner data-icon="inline-start" aria-hidden="true" />}
          Save Access
        </Button>
      </DialogFooter>
    </form>
  )
}
