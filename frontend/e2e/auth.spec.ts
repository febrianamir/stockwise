import { expect, seededUsers, test } from './fixtures'

// Needs the backend on VITE_API_URL with seeded data (`php artisan db:seed`).
test.describe('login', { tag: '@backend' }, () => {
  test('a seeded user logs in and lands on their profile', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill(seededUsers.owner.email)
    await page.getByLabel('Password').fill(seededUsers.owner.password)
    await page.getByRole('button', { name: 'Log In' }).click()

    await expect(page).toHaveURL(/\/profile$/)
  })

  test.describe('with wrong credentials', () => {
    // The API answers 422, which the browser logs as a failed request.
    test.use({ failOnConsoleError: false })

    test('shows an error and stays on the login page', async ({ page }) => {
      await page.goto('/login')

      await page.getByLabel('Email').fill(seededUsers.owner.email)
      await page.getByLabel('Password').fill('not-the-password')
      await page.getByRole('button', { name: 'Log In' }).click()

      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })
  })
})
