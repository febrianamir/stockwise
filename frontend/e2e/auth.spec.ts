import { expect, seededUsers, test } from './fixtures'

// Needs the backend on VITE_API_URL with seeded data (`php artisan db:seed`).
test.describe('login', { tag: '@backend' }, () => {
  test('a seeded user logs in and lands on their profile', async ({ page }, testInfo) => {
    // A different account per project keeps each one under the login rate limit (5 a minute).
    const user = testInfo.project.name === 'mobile' ? seededUsers.cashier : seededUsers.owner
    await page.goto('/login')

    await page.getByLabel('Email').fill(user.email)
    await page.getByLabel('Password').fill(user.password)
    await page.getByRole('button', { name: 'Log In' }).click()

    await expect(page).toHaveURL(/\/profile$/)
  })

  test.describe('with wrong credentials', () => {
    // The API answers 422, which the browser logs as a failed request.
    test.use({ failOnConsoleError: false })

    // Uses the Admin, so the Owner's logins stay under the login rate limit (5 a minute).
    test('shows an error and stays on the login page', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel('Email').fill(seededUsers.admin.email)
      await page.getByLabel('Password').fill('not-the-password')
      await page.getByRole('button', { name: 'Log In' }).click()

      // The credentials error, not a rate-limit one.
      await expect(page.getByText('These credentials do not match our records.')).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })
  })
})
