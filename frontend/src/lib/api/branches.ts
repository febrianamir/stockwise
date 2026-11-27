import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { SortDirection } from './admin-users'
import { api } from './client'
import type { ApiResource, Branch, BranchAccess, BranchScope, BranchStatus, BranchType, CompanyMember, PaginatedResource } from './types'

/**
 * Branch management inside a company (docs/features/branch-management/prd.md §9). Branches are
 * addressed by their ULID public ID under the company. A branch of another company is a 404; a
 * branch the member can't work in is a 403 `BRANCH_ACCESS_DENIED`.
 */

export type BranchSort = 'name' | 'code' | 'created_at'

export interface BranchFilters {
  search?: string
  status?: BranchStatus
  type?: BranchType
  sort?: BranchSort
  direction?: SortDirection
  page?: number
  per_page?: number
}

/** Fields set on create. `code` can't change afterwards (BM-2). */
export interface BranchInput {
  name: string
  code: string
  type: BranchType
  address: string | null
  phone: string | null
  /** Null inherits the company's timezone (BM-9). */
  timezone: string | null
}

export type BranchEditInput = Partial<Omit<BranchInput, 'code'>> & { updated_at: string }

export type BranchAccessInput = { scope: Extract<BranchScope, 'all'> } | { scope: Extract<BranchScope, 'selected'>; branch_ids: string[] }

const base = (companyId: string) => `/companies/${companyId}/branches`

/** GET /companies/{company}/branches: the branches I may work in. */
export function listBranches(companyId: string, filters: BranchFilters, signal?: AbortSignal): Promise<PaginatedResource<Branch>> {
  return api.get<PaginatedResource<Branch>>(base(companyId), { query: { ...filters }, signal })
}

/** GET /companies/{company}/branches/{branch} */
export async function getBranch(companyId: string, branchId: string, signal?: AbortSignal): Promise<Branch> {
  const response = await api.get<ApiResource<Branch>>(`${base(companyId)}/${branchId}`, { signal })

  return response.data
}

/** POST /companies/{company}/branches: `manage-branches`. */
export async function createBranch(companyId: string, input: BranchInput): Promise<Branch> {
  const response = await api.post<ApiResource<Branch>>(base(companyId), { body: input })

  return response.data
}

/** PATCH /companies/{company}/branches/{branch}: 409 `STALE_RECORD` when someone else saved first. */
export async function updateBranch(companyId: string, branchId: string, input: BranchEditInput): Promise<Branch> {
  const response = await api.patch<ApiResource<Branch>>(`${base(companyId)}/${branchId}`, { body: input })

  return response.data
}

/** POST /companies/{company}/branches/{branch}/deactivate */
export async function deactivateBranch(companyId: string, branchId: string, reason: string): Promise<Branch> {
  const response = await api.post<ApiResource<Branch>>(`${base(companyId)}/${branchId}/deactivate`, { body: { reason } })

  return response.data
}

/** POST /companies/{company}/branches/{branch}/reactivate */
export async function reactivateBranch(companyId: string, branchId: string): Promise<Branch> {
  const response = await api.post<ApiResource<Branch>>(`${base(companyId)}/${branchId}/reactivate`)

  return response.data
}

/** GET /companies/{company}/branches/{branch}/members: everyone who can work in the branch. */
export function listBranchMembers(companyId: string, branchId: string, page: number, signal?: AbortSignal): Promise<PaginatedResource<CompanyMember>> {
  return api.get<PaginatedResource<CompanyMember>>(`${base(companyId)}/${branchId}/members`, { query: { page }, signal })
}

/** GET /companies/{company}/members/{membershipId}/branch-access: `manage-branch-access`. */
export async function getMemberBranchAccess(companyId: string, membershipId: number, signal?: AbortSignal): Promise<BranchAccess> {
  const response = await api.get<ApiResource<BranchAccess>>(`/companies/${companyId}/members/${membershipId}/branch-access`, { signal })

  return response.data
}

/** PUT /companies/{company}/members/{membershipId}/branch-access: replaces the member's access (BM-5). */
export async function updateMemberBranchAccess(companyId: string, membershipId: number, input: BranchAccessInput): Promise<BranchAccess> {
  const response = await api.put<ApiResource<BranchAccess>>(`/companies/${companyId}/members/${membershipId}/branch-access`, { body: input })

  return response.data
}

/** GET /companies/{company}/me/branches: my branches, active first. */
export async function listMyBranches(companyId: string, signal?: AbortSignal): Promise<Branch[]> {
  const response = await api.get<{ data: Branch[] }>(`/companies/${companyId}/me/branches`, { signal })

  return response.data
}

/** Query keys, grouped per company. Branch mutations invalidate `branchKeys.company(companyId)`. */
export const branchKeys = {
  all: ['branches'] as const,
  company: (companyId: string) => [...branchKeys.all, companyId] as const,
  lists: (companyId: string) => [...branchKeys.company(companyId), 'list'] as const,
  list: (companyId: string, filters: BranchFilters) => [...branchKeys.lists(companyId), filters] as const,
  detail: (companyId: string, branchId: string) => [...branchKeys.company(companyId), 'detail', branchId] as const,
  members: (companyId: string, branchId: string, page: number) => [...branchKeys.detail(companyId, branchId), 'members', page] as const,
  memberAccess: (companyId: string, membershipId: number) => [...branchKeys.company(companyId), 'member-access', membershipId] as const,
  mine: (companyId: string) => [...branchKeys.company(companyId), 'mine'] as const,
}

export const branchQueries = {
  list: (companyId: string, filters: BranchFilters) =>
    queryOptions({
      queryKey: branchKeys.list(companyId, filters),
      queryFn: ({ signal }) => listBranches(companyId, filters, signal),
      placeholderData: keepPreviousData,
    }),
  detail: (companyId: string, branchId: string) =>
    queryOptions({
      queryKey: branchKeys.detail(companyId, branchId),
      queryFn: ({ signal }) => getBranch(companyId, branchId, signal),
    }),
  members: (companyId: string, branchId: string, page: number) =>
    queryOptions({
      queryKey: branchKeys.members(companyId, branchId, page),
      queryFn: ({ signal }) => listBranchMembers(companyId, branchId, page, signal),
      placeholderData: keepPreviousData,
    }),
  memberAccess: (companyId: string, membershipId: number) =>
    queryOptions({
      queryKey: branchKeys.memberAccess(companyId, membershipId),
      queryFn: ({ signal }) => getMemberBranchAccess(companyId, membershipId, signal),
    }),
  mine: (companyId: string) =>
    queryOptions({
      queryKey: branchKeys.mine(companyId),
      queryFn: ({ signal }) => listMyBranches(companyId, signal),
    }),
}
