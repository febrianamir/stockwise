import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { withArticle } from '@/lib/company'
import {
  addCompanyMember,
  adminCompanyKeys,
  adminUserKeys,
  companyKeys,
  updateCompany,
  updateCompanyMember,
  type AddMemberInput,
  type CompanyMember,
  type CompanyProfileInput,
  type MembershipRole,
  type MembershipStatus,
} from '@/lib/api'

/** Workspace changes also show up in the platform views and user memberships. */
function useInvalidate() {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: companyKeys.all }),
      queryClient.invalidateQueries({ queryKey: adminCompanyKeys.all }),
      queryClient.invalidateQueries({ queryKey: adminUserKeys.all }),
    ])
}

export function useUpdateCompanyProfile(companyId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (input: Partial<CompanyProfileInput> & { updated_at: string }) => updateCompany(companyId, input),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company)
      toast.success('Company updated')
      return invalidate()
    },
  })
}

export function useAddMember(companyId: string) {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: (input: AddMemberInput) => addCompanyMember(companyId, input),
    onSuccess: (member) => {
      toast.success(`${member.user.name} was added`)
      return invalidate()
    },
  })
}

export function useUpdateMember(companyId: string) {
  const invalidate = useInvalidate()

  return useMutation({
    mutationFn: ({ member, ...input }: { member: CompanyMember; role?: Exclude<MembershipRole, 'owner'>; status?: MembershipStatus }) =>
      updateCompanyMember(companyId, member.id, input),
    onSuccess: (member, variables) => {
      toast.success(
        variables.status === 'inactive'
          ? `${member.user.name} was deactivated`
          : variables.status === 'active'
            ? `${member.user.name} was reactivated`
            : `${member.user.name} is now ${withArticle(member.role)}`,
      )
      return invalidate()
    },
  })
}
