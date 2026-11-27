import { test as base, expect } from '@playwright/test'

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

/** Seeded accounts from `php artisan db:seed` (backend/database/seeders). */
export const seededUsers = {
  owner: { email: 'test@example.com', password: 'password' },
  admin: { email: 'demo-admin@example.com', password: 'password' },
} as const
