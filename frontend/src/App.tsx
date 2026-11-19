import { useEffect, useState } from 'react'
import { getCurrentUser, isApiError, type User } from '@/lib/api'

type ApiStatus =
  | { state: 'checking' }
  | { state: 'signed-in'; user: User }
  | { state: 'signed-out' }
  | { state: 'error'; message: string }

function App() {
  const [status, setStatus] = useState<ApiStatus>({ state: 'checking' })

  useEffect(() => {
    const controller = new AbortController()

    getCurrentUser(controller.signal)
      .then((user) => setStatus({ state: 'signed-in', user }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        if (isApiError(error) && error.isUnauthorized) {
          setStatus({ state: 'signed-out' })
        } else {
          setStatus({ state: 'error', message: error instanceof Error ? error.message : 'Unknown error' })
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold tracking-tight">Stockwise</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">React + Vite + TypeScript + Tailwind</p>

        <div className="mt-6 flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800">
          <span
            className={
              'size-2.5 shrink-0 rounded-full ' +
              (status.state === 'checking'
                ? 'animate-pulse bg-slate-400'
                : status.state === 'error'
                  ? 'bg-red-500'
                  : 'bg-emerald-500')
            }
          />
          <span>
            {status.state === 'checking' && 'Connecting to API…'}
            {status.state === 'signed-out' && 'API connected · not signed in'}
            {status.state === 'signed-in' && `API connected · signed in as ${status.user.name}`}
            {status.state === 'error' && `API error: ${status.message}`}
          </span>
        </div>
      </div>
    </main>
  )
}

export default App
