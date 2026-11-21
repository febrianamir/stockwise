import { queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type { ApiResource, User } from './types'

/** GET /api/v1/user — the authenticated user. Throws ApiError(401) when signed out. */
export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const response = await api.get<ApiResource<User>>('/user', { signal })

  return response.data
}

export interface UpdateProfileInput {
  name: string
  phone: string | null
}

/** PATCH /api/v1/user — update personal information. */
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const response = await api.patch<ApiResource<User>>('/user', { body: input })

  return response.data
}

export interface UpdatePasswordInput {
  current_password: string
  password: string
  password_confirmation: string
}

/** PUT /api/v1/user/password — change the password. Other devices are logged out. */
export function updatePassword(input: UpdatePasswordInput): Promise<void> {
  return api.put<void>('/user/password', { body: input })
}

/** Query keys for user data. Invalidate `userKeys.all` to refetch everything user-related. */
export const userKeys = {
  all: ['users'] as const,
  current: () => [...userKeys.all, 'current'] as const,
}

/**
 * TanStack Query options for user data:
 *
 *   const { data: user } = useQuery(userQueries.current())
 *   await queryClient.ensureQueryData(userQueries.current())
 */
export const userQueries = {
  current: () =>
    queryOptions({
      queryKey: userKeys.current(),
      queryFn: ({ signal }) => getCurrentUser(signal),
    }),
}
