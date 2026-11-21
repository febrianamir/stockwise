import { api } from './client'
import type { ApiResource, AuthResponse, MessageResponse, User } from './types'

/**
 * Authentication endpoints (docs/features/auth/prd.md §7). These are mutations only;
 * the logged-in user is read with `userQueries.current()` from `./users`.
 */

export interface RegisterInput {
  name: string
  email: string
  password: string
  password_confirmation: string
}

/** POST /auth/register — creates an unverified account and emails a code. */
export function register(input: RegisterInput): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', { body: input })
}

export interface LoginInput {
  email: string
  password: string
}

/** POST /auth/login */
export function login(input: LoginInput): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { body: input })
}

/** POST /auth/logout — revokes the current token only. */
export function logout(): Promise<void> {
  return api.post<void>('/auth/logout')
}

/** POST /auth/email/verify */
export async function verifyEmail(code: string): Promise<User> {
  const response = await api.post<ApiResource<User>>('/auth/email/verify', { body: { code } })

  return response.data
}

/** POST /auth/email/resend — 429 with `retry_after` during the cooldown. */
export function resendVerificationCode(): Promise<MessageResponse> {
  return api.post<MessageResponse>('/auth/email/resend')
}

/** POST /auth/password/forgot — always 202, whether or not the account exists. */
export function forgotPassword(email: string): Promise<MessageResponse> {
  return api.post<MessageResponse>('/auth/password/forgot', { body: { email } })
}

export interface ResetPasswordInput {
  email: string
  code: string
  password: string
  password_confirmation: string
}

/** POST /auth/password/reset — revokes every token; log in again afterwards. */
export function resetPassword(input: ResetPasswordInput): Promise<void> {
  return api.post<void>('/auth/password/reset', { body: input })
}
