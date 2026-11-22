import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  adminUserKeys,
  createAdminUser,
  deactivateAdminUser,
  reactivateAdminUser,
  setAdminUserSuperadmin,
  type AdminUser,
} from '@/lib/api'

/** Every user mutation refreshes the list, stats and details. */
function useInvalidateAdminUsers() {
  const queryClient = useQueryClient()

  return () => queryClient.invalidateQueries({ queryKey: adminUserKeys.all })
}

export function useCreateUser() {
  const invalidate = useInvalidateAdminUsers()

  return useMutation({
    mutationFn: createAdminUser,
    onSuccess: (user) => {
      toast.success(`${user.name} was created. Share the initial password with them.`)
      return invalidate()
    },
  })
}

export function useDeactivateUser() {
  const invalidate = useInvalidateAdminUsers()

  return useMutation({
    mutationFn: (user: AdminUser) => deactivateAdminUser(user.id),
    onSuccess: (user) => {
      toast.success(`${user.name} was deactivated`)
      return invalidate()
    },
  })
}

export function useReactivateUser() {
  const invalidate = useInvalidateAdminUsers()

  return useMutation({
    mutationFn: (user: AdminUser) => reactivateAdminUser(user.id),
    onSuccess: (user) => {
      toast.success(`${user.name} was reactivated`)
      return invalidate()
    },
  })
}

export function useSetSuperadmin() {
  const invalidate = useInvalidateAdminUsers()

  return useMutation({
    mutationFn: ({ user, isSuperadmin }: { user: AdminUser; isSuperadmin: boolean }) =>
      setAdminUserSuperadmin(user.id, isSuperadmin),
    onSuccess: (user) => {
      toast.success(user.is_superadmin ? `${user.name} is now a Superadmin` : `${user.name} is no longer a Superadmin`)
      return invalidate()
    },
  })
}
