import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logout } from '@/lib/api'
import { endSession } from './session'

/** Revoke the current token, then clear local state even if the API call fails (PRD §6.4). */
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSettled: () => endSession(queryClient),
  })
}
