import { expect, test } from './fixtures'

// Frontend only: these pass without the backend running.

test('guests are redirected from a private page to the login page', async ({ page }) => {
  await page.goto('/profile')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Log In to Stockwise')).toBeVisible()
})

test('the login page shows the form', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log In' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create an Account' })).toHaveAttribute('href', '/register')
})

test('an unknown URL shows the not found page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')

  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible()
})
