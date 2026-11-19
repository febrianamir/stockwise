import { api } from './client'
import type { ApiResource, User } from './types'

/** GET /api/v1/user — the authenticated user. Throws ApiError(401) when signed out. */
export async function getCurrentUser(signal?: AbortSignal): Promise<User> {
  const response = await api.get<ApiResource<User>>('/user', { signal })

  return response.data
}
