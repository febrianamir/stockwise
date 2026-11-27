/** A single Laravel API Resource: `new FooResource($model)`. */
export interface ApiResource<T> {
  data: T
}

/** A paginated Laravel resource collection: `FooResource::collection($query->paginate())`. */
export interface PaginatedResource<T> {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    links: { url: string | null; label: string; active: boolean }[]
    path: string
    per_page: number
    to: number | null
    total: number
  }
}

/** Laravel's JSON error body. `errors` is present on 422 validation failures. */
export interface ApiErrorBody {
  message: string
  errors?: Record<string, string[]>
  /** Present when the client must react to a specific condition (api-conventions). */
  code?: string
}

/** Mirrors backend/app/Enums/UserStatus.php (docs/features/user-management/prd.md §3). */
export type UserStatus = 'pending' | 'active' | 'inactive'

/** Mirrors backend/app/Http/Resources/UserResource.php */
export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  status: UserStatus
  is_superadmin: boolean
  email_verified_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** Register and login responses: the user plus a Sanctum bearer token. */
export interface AuthResponse extends ApiResource<User> {
  token: string
}

/** Plain `{ message }` responses, e.g. "code sent". */
export interface MessageResponse {
  message: string
}

/** 429 body from the auth rate limiters and the resend cooldown. */
export interface RetryAfterBody {
  message: string
  retry_after: number
}

/** Mirrors backend/app/Http/Resources/AdminUserResource.php */
export interface AdminUser {
  id: number
  name: string
  email: string
  status: UserStatus
  is_superadmin: boolean
  /** Active company memberships. */
  companies_count: number
  email_verified_at: string | null
  last_login_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** One entry of a user's account activity, newest first. */
export interface AdminUserActivity {
  /** Audit log id; `null` for the derived `user.last_login` entry. */
  id: number | null
  action:
    | 'user.registered'
    | 'user.created'
    | 'user.email_verified'
    | 'user.deactivated'
    | 'user.reactivated'
    | 'user.superadmin_granted'
    | 'user.superadmin_revoked'
    | 'user.last_login'
  occurred_at: string
  actor: { id: number; name: string } | null
}

/** Mirrors backend/app/Http/Resources/AdminUserDetailResource.php */
export interface AdminUserDetail extends AdminUser {
  memberships: AdminUserMembership[]
  activity: AdminUserActivity[]
}

/** A user's company membership, on platform user details (read-only). */
export interface AdminUserMembership {
  id: number
  company: { id: string; name: string; code: string; status: CompanyStatus }
  role: MembershipRole
  status: MembershipStatus
  is_owner: boolean
  joined_at: string | null
}

/** GET /admin/users/stats */
export interface AdminUserStats {
  total: number
  active: number
  inactive: number
  pending: number
  unverified: number
}

/** Mirrors backend/app/Enums/CompanyStatus.php (docs/features/company-management/prd.md §4). */
export type CompanyStatus = 'active' | 'suspended'

/** Mirrors backend/app/Enums/MembershipRole.php. Exactly one owner per company. */
export type MembershipRole = 'owner' | 'admin' | 'manager' | 'cashier'

/** Mirrors backend/app/Enums/MembershipStatus.php. */
export type MembershipStatus = 'active' | 'inactive'

/** Mirrors backend/app/Http/Resources/AdminCompanyResource.php. `id` is the ULID public ID. */
export interface AdminCompany {
  id: string
  name: string
  code: string
  status: CompanyStatus
  owner: { id: number; name: string; email: string; status: UserStatus } | null
  members_count: number
  created_at: string | null
}

/** Mirrors backend/app/Http/Resources/AdminCompanyDetailResource.php */
export interface AdminCompanyDetail extends AdminCompany {
  legal_name: string | null
  tax_id: string | null
  email: string | null
  phone: string | null
  address: string | null
  timezone: string
  currency: string
  suspended_at: string | null
  suspension_reason: string | null
  created_by: { id: number; name: string } | null
  owner_is_active: boolean
  branches_count: number
  updated_at: string | null
}

/** Mirrors backend/app/Http/Resources/CompanyMemberResource.php */
export interface CompanyMember {
  id: number
  user: { id: number; name: string; email: string; status: UserStatus }
  role: MembershipRole
  status: MembershipStatus
  is_owner: boolean
  /** Which branches the member may work in; always `all` for the owner (BR-3). */
  branch_scope: BranchScope
  joined_at: string | null
}

/** Mirrors backend/app/Http/Resources/CompanyActivityResource.php */
export interface CompanyActivity {
  id: number
  action:
    | 'company.created'
    | 'company.updated'
    | 'company.suspended'
    | 'company.reactivated'
    | 'company.ownership_transferred'
    | 'company.member_added'
    | 'company.member_role_changed'
    | 'company.member_deactivated'
    | 'company.member_reactivated'
    | 'branch.created'
    | 'branch.updated'
    | 'branch.deactivated'
    | 'branch.reactivated'
    | 'branch_access.updated'
  occurred_at: string
  actor: { id: number; name: string } | null
  /** For member actions: who the action was about. */
  member: { id: number; name: string } | null
  /** For branch actions: the branch the action was about. */
  branch: { id: string; name: string; code: string } | null
  metadata: {
    /** Field edits; `branch_access` holds a scope-and-branches snapshot instead of a string. */
    changes?: Record<string, { from: string | null; to: string | null } | { from: BranchAccessSnapshot; to: BranchAccessSnapshot }>
    reason?: string
    note?: string
    previous_reason?: string
    previous_status?: string
    previous_owner_id?: number
    new_owner_id?: number
    previous_owner_role?: string
    new_owner_previous_role?: string
    timezone?: string
    currency?: string
    owner_id?: number
    user_id?: number
    role?: string
    code?: string
    name?: string
  }
}

/** GET /admin/companies/stats */
export interface AdminCompanyStats {
  total: number
  active: number
  suspended: number
}

/** Company permissions (backend/app/Enums/CompanyPermission.php), mapped from roles. */
export type CompanyPermission =
  | 'view-company'
  | 'manage-company'
  | 'manage-members'
  | 'view-branches'
  | 'manage-branches'
  | 'manage-branch-access'

/** Mirrors backend/app/Http/Resources/MyCompanyResource.php: one of my active memberships. */
export interface MyCompany {
  id: string
  name: string
  code: string
  status: CompanyStatus
  role: MembershipRole
  is_owner: boolean
  joined_at: string | null
}

/** Mirrors backend/app/Http/Resources/CompanyResource.php: a company as its members see it. */
export interface Company {
  id: string
  name: string
  code: string
  status: CompanyStatus
  legal_name: string | null
  tax_id: string | null
  email: string | null
  phone: string | null
  address: string | null
  timezone: string
  currency: string
  owner: { id: number; name: string; email: string } | null
  members_count: number
  created_at: string | null
  updated_at: string | null
  membership: { role: MembershipRole; is_owner: boolean; permissions: CompanyPermission[] }
}

/** Branch types and statuses (backend/app/Enums/BranchType.php, BranchStatus.php). */
export type BranchType = 'store' | 'warehouse'
export type BranchStatus = 'active' | 'inactive'
/** `all`: every branch, including later ones; `selected`: only the granted ones (BM-3). */
export type BranchScope = 'all' | 'selected'

/** Mirrors backend/app/Http/Resources/BranchResource.php */
export interface Branch {
  id: string
  name: string
  code: string
  type: BranchType
  status: BranchStatus
  address: string | null
  phone: string | null
  /** Null means the company's timezone (BM-9). */
  timezone: string | null
  deactivated_at: string | null
  deactivation_reason: string | null
  /** Active members who can work here; absent on `/me/branches`. */
  members_count?: number
  created_at: string | null
  updated_at: string | null
}

/** A granted branch inside a member's branch access. */
export type BranchSummary = Pick<Branch, 'id' | 'name' | 'code' | 'type' | 'status'>

/** Mirrors backend/app/Http/Resources/BranchAccessResource.php */
export interface BranchAccess {
  membership_id: number
  scope: BranchScope
  is_owner: boolean
  /** Granted branches when `scope` is `selected`; empty otherwise. */
  branches: BranchSummary[]
}

/** `branch_access.updated` audit metadata: the scope and granted branch codes. */
export interface BranchAccessSnapshot {
  scope: BranchScope
  branches: string[]
}
