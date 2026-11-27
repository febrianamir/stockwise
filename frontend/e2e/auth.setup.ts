import { readFile } from 'node:fs/promises'
import { test as setup, type APIRequestContext } from '@playwright/test'
import { apiUrl, authFile, seededUsers, TOKEN_STORAGE_KEY, type SeededUser } from './fixtures'

/**
 * Signs each seeded user in once and saves the session for specs that use
 * `test.use({ storageState: authFile(user) })`. A saved token that still works is reused, so
 * repeated runs stay under the login rate limit (5 a minute per account). Tagged @backend: it
 * needs the API, and `--grep-invert @backend` skips it with the specs that depend on it.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

async function savedToken(user: SeededUser): Promise<string | null> {
  try {
    const state = JSON.parse(await readFile(authFile(user), 'utf8')) as { origins?: { localStorage?: { name: string; value: string }[] }[] }
    return state.origins?.[0]?.localStorage?.find((entry) => entry.name === TOKEN_STORAGE_KEY)?.value ?? null
  } catch {
    return null
  }
}

async function isValid(request: APIRequestContext, token: string): Promise<boolean> {
  const response = await request.get(`${apiUrl}/user`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
  return response.ok()
}

async function login(request: APIRequestContext, user: SeededUser): Promise<string> {
  const response = await request.post(`${apiUrl}/auth/login`, { headers: { Accept: 'application/json' }, data: seededUsers[user] })
  if (!response.ok()) {
    throw new Error(`Logging in ${seededUsers[user].email} failed with ${response.status()}. Is the API running with seeded data (php artisan db:seed)?`)
  }
  return ((await response.json()) as { token: string }).token
}

for (const user of Object.keys(seededUsers) as SeededUser[]) {
  setup(`sign in the seeded ${user}`, { tag: '@backend' }, async ({ request, browser }) => {
    const existing = await savedToken(user)
    const token = existing && (await isValid(request, existing)) ? existing : await login(request, user)

    const context = await browser.newContext({
      storageState: { cookies: [], origins: [{ origin: new URL(baseURL).origin, localStorage: [{ name: TOKEN_STORAGE_KEY, value: token }] }] },
    })
    await context.storageState({ path: authFile(user) })
    await context.close()
  })
}
