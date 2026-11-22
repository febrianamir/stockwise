import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type { AdminUser, AdminUserDetail, AdminUserStats, ApiResource, PaginatedResource, UserStatus } from './types'

/**
 * Platform user management (docs/features/user-management/prd.md §7). Superadmin only:
 * every endpoint returns 403 to anyone else.
 */

export type AdminUserSort = 'name' | 'created_at' | 'last_login_at'
export type SortDirection = 'asc' | 'desc'

export interface AdminUserFilters {
  search?: string
  status?: UserStatus
  verification?: 'verified' | 'unverified'
  /** `YYYY-MM-DD`, inclusive */
  created_from?: string
  /** `YYYY-MM-DD`, inclusive */
  created_to?: string
  sort?: AdminUserSort
  direction?: SortDirection
  page?: number
  per_page?: number
}

/** GET /admin/users */
export function listAdminUsers(filters: AdminUserFilters, signal?: AbortSignal): Promise<PaginatedResource<AdminUser>> {
  return api.get<PaginatedResource<AdminUser>>('/admin/users', { query: { ...filters }, signal })
}

/** GET /admin/users/stats */
export async function getAdminUserStats(signal?: AbortSignal): Promise<AdminUserStats> {
  const response = await api.get<ApiResource<AdminUserStats>>('/admin/users/stats', { signal })

  return response.data
}

/** GET /admin/users/{id} */
export async function getAdminUser(userId: number, signal?: AbortSignal): Promise<AdminUserDetail> {
  const response = await api.get<ApiResource<AdminUserDetail>>(`/admin/users/${userId}`, { signal })

  return response.data
}

export interface CreateAdminUserInput {
  name: string
  email: string
  password: string
  password_confirmation: string
}

/** POST /admin/users — creates a pending user with an initial password (UM-7). */
export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const response = await api.post<ApiResource<AdminUser>>('/admin/users', { body: input })

  return response.data
}

/** POST /admin/users/{id}/deactivate — also revokes every token (UM-3). */
export async function deactivateAdminUser(userId: number): Promise<AdminUser> {
  const response = await api.post<ApiResource<AdminUser>>(`/admin/users/${userId}/deactivate`)

  return response.data
}

/** POST /admin/users/{id}/reactivate */
export async function reactivateAdminUser(userId: number): Promise<AdminUser> {
  const response = await api.post<ApiResource<AdminUser>>(`/admin/users/${userId}/reactivate`)

  return response.data
}

/** PUT /admin/users/{id}/superadmin */
export async function setAdminUserSuperadmin(userId: number, isSuperadmin: boolean): Promise<AdminUser> {
  const response = await api.put<ApiResource<AdminUser>>(`/admin/users/${userId}/superadmin`, {
    body: { is_superadmin: isSuperadmin },
  })

  return response.data
}

/** Query keys. Mutations invalidate `adminUserKeys.all`. */
export const adminUserKeys = {
  all: ['admin-users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (filters: AdminUserFilters) => [...adminUserKeys.lists(), filters] as const,
  stats: () => [...adminUserKeys.all, 'stats'] as const,
  detail: (userId: number) => [...adminUserKeys.all, 'detail', userId] as const,
}

export const adminUserQueries = {
  /** Keeps the previous page visible while the next page or filter loads. */
  list: (filters: AdminUserFilters) =>
    queryOptions({
      queryKey: adminUserKeys.list(filters),
      queryFn: ({ signal }) => listAdminUsers(filters, signal),
      placeholderData: keepPreviousData,
    }),
  stats: () =>
    queryOptions({
      queryKey: adminUserKeys.stats(),
      queryFn: ({ signal }) => getAdminUserStats(signal),
    }),
  detail: (userId: number) =>
    queryOptions({
      queryKey: adminUserKeys.detail(userId),
      queryFn: ({ signal }) => getAdminUser(userId, signal),
    }),
}
