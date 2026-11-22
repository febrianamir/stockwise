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
  activity: AdminUserActivity[]
}

/** GET /admin/users/stats */
export interface AdminUserStats {
  total: number
  active: number
  inactive: number
  pending: number
  unverified: number
}
