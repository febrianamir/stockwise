import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api } from './client'
import type {
  AdminCompany,
  AdminCompanyDetail,
  AdminCompanyStats,
  ApiResource,
  CompanyActivity,
  CompanyMember,
  CompanyStatus,
  PaginatedResource,
} from './types'
import type { SortDirection } from './admin-users'

/**
 * Platform company management (docs/features/company-management/prd.md §7). Superadmin only.
 * Companies are addressed by their ULID public ID.
 */

export type AdminCompanySort = 'name' | 'created_at'

export interface AdminCompanyFilters {
  search?: string
  status?: CompanyStatus
  /** `YYYY-MM-DD`, inclusive */
  created_from?: string
  /** `YYYY-MM-DD`, inclusive */
  created_to?: string
  sort?: AdminCompanySort
  direction?: SortDirection
  page?: number
  per_page?: number
}

/** Editable profile fields (PRD §4). */
export interface CompanyProfileInput {
  name: string
  legal_name: string | null
  tax_id: string | null
  email: string | null
  phone: string | null
  address: string | null
  timezone: string
  currency: string
}

export interface CreateCompanyInput extends CompanyProfileInput {
  code: string
  /** `null` lets the API report "Choose an owner". */
  owner_user_id: number | null
}

/** GET /admin/companies */
export function listAdminCompanies(filters: AdminCompanyFilters, signal?: AbortSignal): Promise<PaginatedResource<AdminCompany>> {
  return api.get<PaginatedResource<AdminCompany>>('/admin/companies', { query: { ...filters }, signal })
}

/** GET /admin/companies/stats */
export async function getAdminCompanyStats(signal?: AbortSignal): Promise<AdminCompanyStats> {
  const response = await api.get<ApiResource<AdminCompanyStats>>('/admin/companies/stats', { signal })

  return response.data
}

/** GET /admin/companies/{id} */
export async function getAdminCompany(companyId: string, signal?: AbortSignal): Promise<AdminCompanyDetail> {
  const response = await api.get<ApiResource<AdminCompanyDetail>>(`/admin/companies/${companyId}`, { signal })

  return response.data
}

export interface AdminCompanyMemberFilters {
  page?: number
  /** Partial name or email. */
  search?: string
  /** Only members who can become the owner (CM-13). */
  eligible_owner?: boolean
}

/** GET /admin/companies/{id}/members */
export function listAdminCompanyMembers(companyId: string, filters: AdminCompanyMemberFilters, signal?: AbortSignal): Promise<PaginatedResource<CompanyMember>> {
  return api.get<PaginatedResource<CompanyMember>>(`/admin/companies/${companyId}/members`, {
    query: { page: filters.page, search: filters.search, eligible_owner: filters.eligible_owner ? 1 : undefined },
    signal,
  })
}

/** GET /admin/companies/{id}/activity */
export function listAdminCompanyActivity(companyId: string, page: number, signal?: AbortSignal): Promise<PaginatedResource<CompanyActivity>> {
  return api.get<PaginatedResource<CompanyActivity>>(`/admin/companies/${companyId}/activity`, { query: { page }, signal })
}

/** POST /admin/companies — creates the company and its owner membership (CM-3). */
export async function createAdminCompany(input: CreateCompanyInput): Promise<AdminCompanyDetail> {
  const response = await api.post<ApiResource<AdminCompanyDetail>>('/admin/companies', { body: input })

  return response.data
}

/** PATCH /admin/companies/{id} — 409 `STALE_RECORD` when someone else saved first (CM-11). */
export async function updateAdminCompany(
  companyId: string,
  input: Partial<CompanyProfileInput> & { updated_at: string },
): Promise<AdminCompanyDetail> {
  const response = await api.patch<ApiResource<AdminCompanyDetail>>(`/admin/companies/${companyId}`, { body: input })

  return response.data
}

/** POST /admin/companies/{id}/suspend */
export async function suspendAdminCompany(companyId: string, reason: string): Promise<AdminCompanyDetail> {
  const response = await api.post<ApiResource<AdminCompanyDetail>>(`/admin/companies/${companyId}/suspend`, { body: { reason } })

  return response.data
}

/** POST /admin/companies/{id}/reactivate */
export async function reactivateAdminCompany(companyId: string, note: string | null): Promise<AdminCompanyDetail> {
  const response = await api.post<ApiResource<AdminCompanyDetail>>(`/admin/companies/${companyId}/reactivate`, { body: { note } })

  return response.data
}

/** POST /admin/companies/{id}/transfer-ownership */
export async function transferAdminCompanyOwnership(companyId: string, userId: number, reason: string): Promise<AdminCompanyDetail> {
  const response = await api.post<ApiResource<AdminCompanyDetail>>(`/admin/companies/${companyId}/transfer-ownership`, {
    body: { user_id: userId, reason },
  })

  return response.data
}

/** Query keys. Mutations invalidate `adminCompanyKeys.all` (and user keys, for memberships). */
export const adminCompanyKeys = {
  all: ['admin-companies'] as const,
  lists: () => [...adminCompanyKeys.all, 'list'] as const,
  list: (filters: AdminCompanyFilters) => [...adminCompanyKeys.lists(), filters] as const,
  stats: () => [...adminCompanyKeys.all, 'stats'] as const,
  detail: (companyId: string) => [...adminCompanyKeys.all, 'detail', companyId] as const,
  members: (companyId: string, filters: AdminCompanyMemberFilters) => [...adminCompanyKeys.detail(companyId), 'members', filters] as const,
  activity: (companyId: string, page: number) => [...adminCompanyKeys.detail(companyId), 'activity', page] as const,
}

export const adminCompanyQueries = {
  list: (filters: AdminCompanyFilters) =>
    queryOptions({
      queryKey: adminCompanyKeys.list(filters),
      queryFn: ({ signal }) => listAdminCompanies(filters, signal),
      placeholderData: keepPreviousData,
    }),
  stats: () =>
    queryOptions({
      queryKey: adminCompanyKeys.stats(),
      queryFn: ({ signal }) => getAdminCompanyStats(signal),
    }),
  detail: (companyId: string) =>
    queryOptions({
      queryKey: adminCompanyKeys.detail(companyId),
      queryFn: ({ signal }) => getAdminCompany(companyId, signal),
    }),
  members: (companyId: string, filters: AdminCompanyMemberFilters) =>
    queryOptions({
      queryKey: adminCompanyKeys.members(companyId, filters),
      queryFn: ({ signal }) => listAdminCompanyMembers(companyId, filters, signal),
      placeholderData: keepPreviousData,
    }),
  activity: (companyId: string, page: number) =>
    queryOptions({
      queryKey: adminCompanyKeys.activity(companyId, page),
      queryFn: ({ signal }) => listAdminCompanyActivity(companyId, page, signal),
      placeholderData: keepPreviousData,
    }),
}
