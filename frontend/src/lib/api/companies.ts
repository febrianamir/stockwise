import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { CompanyProfileInput } from './admin-companies'
import { api } from './client'
import type { ApiResource, Company, CompanyMember, MembershipRole, MembershipStatus, MyCompany, PaginatedResource } from './types'

/**
 * Company workspace: a company from its members' side (docs/features/company-workspace/prd.md §6).
 * Tenant routes: non-members get 404, suspended companies 403 `COMPANY_SUSPENDED`.
 */

/** GET /companies: my active memberships. */
export async function listMyCompanies(signal?: AbortSignal): Promise<MyCompany[]> {
  const response = await api.get<{ data: MyCompany[] }>('/companies', { signal })

  return response.data
}

/** GET /companies/{id} */
export async function getCompany(companyId: string, signal?: AbortSignal): Promise<Company> {
  const response = await api.get<ApiResource<Company>>(`/companies/${companyId}`, { signal })

  return response.data
}

/** PATCH /companies/{id}: Owners and Admins; 409 `STALE_RECORD` when someone else saved first. */
export async function updateCompany(companyId: string, input: Partial<CompanyProfileInput> & { updated_at: string }): Promise<Company> {
  const response = await api.patch<ApiResource<Company>>(`/companies/${companyId}`, { body: input })

  return response.data
}

/** GET /companies/{id}/members */
export function listCompanyMembers(companyId: string, page: number, signal?: AbortSignal): Promise<PaginatedResource<CompanyMember>> {
  return api.get<PaginatedResource<CompanyMember>>(`/companies/${companyId}/members`, { query: { page }, signal })
}

export interface AddMemberInput {
  email: string
  role: Exclude<MembershipRole, 'owner'>
}

/** POST /companies/{id}/members: adds an existing active user (CW-3). */
export async function addCompanyMember(companyId: string, input: AddMemberInput): Promise<CompanyMember> {
  const response = await api.post<ApiResource<CompanyMember>>(`/companies/${companyId}/members`, { body: input })

  return response.data
}

/** PATCH /companies/{id}/members/{membershipId}: change role or status (CW-4). */
export async function updateCompanyMember(
  companyId: string,
  membershipId: number,
  input: { role?: Exclude<MembershipRole, 'owner'>; status?: MembershipStatus },
): Promise<CompanyMember> {
  const response = await api.patch<ApiResource<CompanyMember>>(`/companies/${companyId}/members/${membershipId}`, { body: input })

  return response.data
}

/** Query keys. Workspace mutations invalidate `companyKeys.all`. */
export const companyKeys = {
  all: ['companies'] as const,
  mine: () => [...companyKeys.all, 'mine'] as const,
  detail: (companyId: string) => [...companyKeys.all, 'detail', companyId] as const,
  members: (companyId: string, page: number) => [...companyKeys.detail(companyId), 'members', page] as const,
}

export const companyQueries = {
  mine: () =>
    queryOptions({
      queryKey: companyKeys.mine(),
      queryFn: ({ signal }) => listMyCompanies(signal),
    }),
  detail: (companyId: string) =>
    queryOptions({
      queryKey: companyKeys.detail(companyId),
      queryFn: ({ signal }) => getCompany(companyId, signal),
    }),
  members: (companyId: string, page: number) =>
    queryOptions({
      queryKey: companyKeys.members(companyId, page),
      queryFn: ({ signal }) => listCompanyMembers(companyId, page, signal),
      placeholderData: keepPreviousData,
    }),
}
