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

/** Mirrors backend/app/Http/Resources/UserResource.php */
export interface User {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  created_at: string | null
  updated_at: string | null
}
