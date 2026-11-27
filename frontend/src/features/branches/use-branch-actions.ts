import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  adminCompanyKeys,
  branchKeys,
  companyKeys,
  createBranch,
  deactivateBranch,
  reactivateBranch,
  updateBranch,
  updateMemberBranchAccess,
  type Branch,
  type BranchAccessInput,
  type BranchEditInput,
  type BranchInput,
  type CompanyMember,
} from '@/lib/api'

/** Branch changes also show on the company page (branch cards, member scopes) and the platform views. */
function useInvalidate(companyId: string) {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: branchKeys.company(companyId) }),
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(companyId) }),
      queryClient.invalidateQueries({ queryKey: adminCompanyKeys.detail(companyId) }),
    ])
}

export function useCreateBranch(companyId: string) {
  const invalidate = useInvalidate(companyId)

  return useMutation({
    mutationFn: (input: BranchInput) => createBranch(companyId, input),
    onSuccess: (branch) => {
      toast.success(`${branch.name} was created`)
      return invalidate()
    },
  })
}

export function useUpdateBranch(companyId: string, branchId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate(companyId)

  return useMutation({
    mutationFn: (input: BranchEditInput) => updateBranch(companyId, branchId, input),
    onSuccess: (branch) => {
      queryClient.setQueryData(branchKeys.detail(companyId, branch.id), branch)
      toast.success('Branch updated')
      return invalidate()
    },
  })
}

export function useDeactivateBranch(companyId: string) {
  const invalidate = useInvalidate(companyId)

  return useMutation({
    mutationFn: ({ branch, reason }: { branch: Branch; reason: string }) => deactivateBranch(companyId, branch.id, reason),
    onSuccess: (branch) => {
      toast.success(`${branch.name} was deactivated`)
      return invalidate()
    },
  })
}

export function useReactivateBranch(companyId: string) {
  const invalidate = useInvalidate(companyId)

  return useMutation({
    mutationFn: (branch: Branch) => reactivateBranch(companyId, branch.id),
    onSuccess: (branch) => {
      toast.success(`${branch.name} was reactivated`)
      return invalidate()
    },
  })
}

export function useUpdateBranchAccess(companyId: string) {
  const invalidate = useInvalidate(companyId)

  return useMutation({
    mutationFn: ({ member, input }: { member: CompanyMember; input: BranchAccessInput }) => updateMemberBranchAccess(companyId, member.id, input),
    onSuccess: (_access, { member }) => {
      toast.success(`Branch access updated for ${member.user.name}`)
      return invalidate()
    },
  })
}
