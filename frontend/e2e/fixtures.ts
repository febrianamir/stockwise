import { fileURLToPath } from 'node:url'
import { test as base, expect, type APIRequestContext } from '@playwright/test'

/**
 * Shared Playwright fixtures. Every spec imports `test` and `expect` from here, not from
 * `@playwright/test`, so each test fails when the page logs a console error or throws an
 * uncaught exception (docs/design/ui-guidelines.md §16: "No console errors remain").
 *
 * A test that expects an error on purpose can opt out with `test.use({ failOnConsoleError: false })`.
 */
export const test = base.extend<{ failOnConsoleError: boolean; consoleErrors: string[] }>({
  failOnConsoleError: [true, { option: true }],
  consoleErrors: [
    async ({ page, failOnConsoleError }, use) => {
      const errors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`)
      })
      page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`))

      await use(errors)

      if (failOnConsoleError) {
        expect(errors, 'the page logged errors').toEqual([])
      }
    },
    { auto: true },
  ],
})

export { expect }

/**
 * Seeded accounts from `php artisan db:seed` (backend/database/seeders): the Owner and an Admin of
 * "Demo Retail", and a Cashier who may only work in Gowa Store.
 */
export const seededUsers = {
  owner: { email: 'test@example.com', password: 'password' },
  admin: { email: 'demo-admin@example.com', password: 'password' },
  cashier: { email: 'demo-cashier@example.com', password: 'password' },
} as const

export type SeededUser = keyof typeof seededUsers

/** The API the app talks to (frontend/.env `VITE_API_URL`). */
export const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:8000/api/v1'

/** Where e2e/auth.setup.ts saves a seeded user's session. Use with `test.use({ storageState: authFile('owner') })`. */
export function authFile(user: SeededUser): string {
  return fileURLToPath(new URL(`./.auth/${user}.json`, import.meta.url))
}

/** The localStorage key the API client keeps the bearer token in (src/lib/api/client.ts). */
export const TOKEN_STORAGE_KEY = 'stockwise.auth_token'

/** Reads the bearer token from a session saved by e2e/auth.setup.ts. */
async function tokenOf(user: SeededUser): Promise<string> {
  const { readFile } = await import('node:fs/promises')
  const state = JSON.parse(await readFile(authFile(user), 'utf8')) as { origins: { localStorage: { name: string; value: string }[] }[] }
  const token = state.origins[0]?.localStorage.find((entry) => entry.name === TOKEN_STORAGE_KEY)?.value
  if (!token) {
    throw new Error(`No saved session for ${user}; the setup project signs seeded users in.`)
  }
  return token
}

/**
 * The seeded "Demo Retail" company and its branch IDs by code (MKS, GOW, CWH), read through the
 * API as the Owner, for specs that open URLs directly.
 */
export async function demoCompany(request: APIRequestContext): Promise<{ companyId: string; branchIds: Record<string, string> }> {
  const headers = { Accept: 'application/json', Authorization: `Bearer ${await tokenOf('owner')}` }
  const companies = (await (await request.get(`${apiUrl}/companies`, { headers })).json()) as { data: { id: string; code: string }[] }
  const company = companies.data.find((item) => item.code === 'demo-retail')
  if (!company) {
    throw new Error('The seeded "Demo Retail" company is missing; run php artisan db:seed.')
  }
  const branches = (await (await request.get(`${apiUrl}/companies/${company.id}/branches?per_page=100`, { headers })).json()) as {
    data: { id: string; code: string }[]
  }
  return { companyId: company.id, branchIds: Object.fromEntries(branches.data.map((branch) => [branch.code, branch.id])) }
}
