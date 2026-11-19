import type { ApiErrorBody } from './types'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/+$/, '')

const TOKEN_STORAGE_KEY = 'stockwise.auth_token'

type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue | QueryValue[]>

export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  /** Appended to the URL. `null`/`undefined` values are skipped; arrays become `key[]=a&key[]=b`. */
  query?: Query
  /** Plain values are sent as JSON. `FormData` is sent as-is (multipart, e.g. file uploads). */
  body?: unknown
}

/** Thrown for any non-2xx response, or with status 0 when the request never reached the server. */
export class ApiError extends Error {
  readonly status: number
  /** Field errors from a 422 response, keyed by field name. Empty otherwise. */
  readonly errors: Record<string, string[]>
  readonly body: unknown

  constructor(status: number, message: string, errors: Record<string, string[]> = {}, body: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.body = body
  }

  get isValidationError(): boolean {
    return this.status === 422
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** First validation message for a field, handy for form inputs. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Bearer token persistence (Sanctum personal access tokens). */
export const authToken = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
      return null
    }
  },
  set(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token)
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      }
    } catch {
      // Storage unavailable (private mode, blocked); the token just won't persist.
    }
  },
}

let unauthorizedHandler: ((error: ApiError) => void) | null = null

/** Register a global reaction to 401 responses, e.g. clearing auth state or redirecting to login. */
export function onUnauthorized(handler: ((error: ApiError) => void) | null): void {
  unauthorizedHandler = handler
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_URL}/${path.replace(/^\/+/, '')}`)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined) {
          url.searchParams.append(`${key}[]`, String(item))
        }
      }
    } else if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }

  const text = await response.text()
  if (!text) {
    return undefined
  }

  const isJson = response.headers.get('Content-Type')?.includes('application/json')
  if (!isJson) {
    return text
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, headers: extraHeaders, ...init } = options

  const headers = new Headers(extraHeaders)
  headers.set('Accept', 'application/json')

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }

  const token = authToken.get()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), { ...init, method, headers, body: payload })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiError(0, 'Unable to reach the server. Check your connection and that the API is running.')
  }

  const data = await parseBody(response)

  if (!response.ok) {
    const errorBody = (typeof data === 'object' && data !== null ? data : {}) as Partial<ApiErrorBody>
    const error = new ApiError(
      response.status,
      errorBody.message || response.statusText || 'Request failed',
      errorBody.errors ?? {},
      data,
    )

    if (error.isUnauthorized) {
      unauthorizedHandler?.(error)
    }

    throw error
  }

  return data as T
}

/**
 * Central client for the Laravel API. Paths are relative to VITE_API_URL:
 *
 *   api.get<ApiResource<User>>('/user')
 *   api.post<ApiResource<Product>>('/products', { body: { name: 'Widget' } })
 *   api.get<PaginatedResource<Product>>('/products', { query: { page: 2 } })
 */
export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T = void>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}
