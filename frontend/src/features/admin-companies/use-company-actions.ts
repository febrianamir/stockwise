import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  adminCompanyKeys,
  adminUserKeys,
  companyKeys,
  createAdminCompany,
  reactivateAdminCompany,
  suspendAdminCompany,
  transferAdminCompanyOwnership,
  updateAdminCompany,
  type AdminCompanyDetail,
  type CompanyProfileInput,
} from '@/lib/api'

/**
 * Company changes affect the company views and the users' membership data. The returned company
 * is written to the detail cache first, so the page shows the new state without waiting.
 */
function useInvalidate() {
  const queryClient = useQueryClient()

  return (company?: AdminCompanyDetail) => {
    if (company) {
      queryClient.setQueryData(adminCompanyKeys.detail(company.id), company)
    }

    return Promise.all([
      queryClient.invalidateQueries({ queryKey: adminCompanyKeys.all }),
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
      // A Superadmin may also be a member: keep My Companies and the workspace in step.
      queryClient.invalidateQueries({ queryKey: companyKeys.all }),
    ])
  }
}

export function useCreateCompany() {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: createAdminCompany,
    onSuccess: (company) => {
      toast.success(`${company.name} was created`)
      return invalidate(company)
    },
  })
}

export function useUpdateCompany(companyId: string) {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (input: Partial<CompanyProfileInput> & { updated_at: string }) => updateAdminCompany(companyId, input),
    onSuccess: (company) => {
      toast.success('Company updated')
      return invalidate(company)
    },
  })
}

export function useSuspendCompany() {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: ({ company, reason }: { company: AdminCompanyDetail; reason: string }) => suspendAdminCompany(company.id, reason),
    onSuccess: (company) => {
      toast.success(`${company.name} was suspended`)
      return invalidate(company)
    },
  })
}

export function useReactivateCompany() {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: ({ company, note }: { company: AdminCompanyDetail; note: string | null }) => reactivateAdminCompany(company.id, note),
    onSuccess: (company) => {
      toast.success(`${company.name} was reactivated`)
      return invalidate(company)
    },
  })
}

export function useTransferOwnership() {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: ({ company, userId, reason }: { company: AdminCompanyDetail; userId: number; reason: string }) =>
      transferAdminCompanyOwnership(company.id, userId, reason),
    onSuccess: (company) => {
      toast.success(`${company.owner?.name ?? 'The new owner'} now owns ${company.name}`)
      return invalidate(company)
    },
  })
}
