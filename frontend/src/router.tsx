import { createBrowserRouter, Navigate } from 'react-router'
import { PageLoading } from '@/components/page-status'
import { RequireAuth, RequireGuest } from '@/features/auth/components/route-guards'

/** Routes and access rules: docs/features/auth/prd.md §8. Pages load on demand. */
export const router = createBrowserRouter([
  {
    element: <RequireGuest />,
    HydrateFallback: PageLoading,
    children: [
      { path: '/login', lazy: async () => ({ Component: (await import('@/features/auth/pages/login-page')).LoginPage }) },
      { path: '/register', lazy: async () => ({ Component: (await import('@/features/auth/pages/register-page')).RegisterPage }) },
      {
        path: '/forgot-password',
        lazy: async () => ({ Component: (await import('@/features/auth/pages/forgot-password-page')).ForgotPasswordPage }),
      },
      {
        path: '/reset-password',
        lazy: async () => ({ Component: (await import('@/features/auth/pages/reset-password-page')).ResetPasswordPage }),
      },
    ],
  },
  {
    element: <RequireAuth />,
    HydrateFallback: PageLoading,
    children: [
      {
        path: '/verify-email',
        lazy: async () => ({ Component: (await import('@/features/auth/pages/verify-email-page')).VerifyEmailPage }),
      },
      {
        lazy: async () => ({ Component: (await import('@/components/layout/app-layout')).AppLayout }),
        children: [
          { path: '/profile', lazy: async () => ({ Component: (await import('@/features/profile/pages/profile-page')).ProfilePage }) },
        ],
      },
    ],
  },
  // No dashboard yet (PRD §8).
  { path: '/', element: <Navigate to="/profile" replace /> },
  { path: '*', lazy: async () => ({ Component: (await import('@/features/not-found-page')).NotFoundPage }) },
])
