import { authFile, demoCompany, expect, test } from './fixtures'

// Branch management (docs/features/branch-management/prd.md §8). Needs the API with seeded data.
test.describe('branches', { tag: '@backend' }, () => {
  test.describe('as the owner', () => {
    test.use({ storageState: authFile('owner') })

    test('creates, edits, deactivates and reactivates a branch', async ({ page }, testInfo) => {
      // Unique per run and project; the code is entered lowercase and stored uppercase.
      const suffix = `${testInfo.project.name.charAt(0)}${Date.now().toString(36).slice(-6)}`.toUpperCase()
      const name = `E2E Store ${suffix}`

      await page.goto('/companies')
      await page.getByRole('link', { name: 'Demo Retail' }).click()
      await page.getByRole('button', { name: 'View All Branches' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Branches' })).toBeVisible()

      // Link buttons (`Button render={<Link />}`) are exposed as buttons.
      await page.getByRole('button', { name: 'Add Branch' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Add Branch' })).toBeVisible()
      await page.getByLabel('Name', { exact: true }).fill(name)
      await page.getByLabel('Code', { exact: true }).fill(`e2e-${suffix.toLowerCase()}`)
      await page.getByLabel(/^Address/).fill('Jl. Pengujian No. 1, Makassar')
      await page.getByRole('button', { name: 'Add Branch' }).click()

      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
      await expect(page.getByText(`E2E-${suffix}`).first()).toBeVisible()

      await page.getByRole('button', { name: 'Edit Branch' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Edit Branch' })).toBeVisible()
      await expect(page.getByLabel('Code', { exact: true })).toBeDisabled()
      await page.getByLabel('Name', { exact: true }).fill(`${name} Renamed`)
      await page.getByRole('button', { name: 'Save Changes' }).click()
      await expect(page.getByRole('heading', { level: 1, name: `${name} Renamed` })).toBeVisible()

      await page.getByRole('button', { name: 'Deactivate', exact: true }).click()
      const deactivate = page.getByRole('alertdialog', { name: 'Deactivate This Branch?' })
      await expect(deactivate.getByRole('button', { name: 'Deactivate Branch' })).toBeDisabled()
      await deactivate.getByLabel('Reason').fill('Closed for an end-to-end test.')
      await deactivate.getByRole('button', { name: 'Deactivate Branch' }).click()
      await expect(page.getByText('This branch is inactive')).toBeVisible()
      await expect(page.getByText('Reason: Closed for an end-to-end test.')).toBeVisible()

      await page.getByRole('button', { name: 'Reactivate', exact: true }).click()
      await page.getByRole('alertdialog', { name: 'Reactivate This Branch?' }).getByRole('button', { name: 'Reactivate Branch' }).click()
      await expect(page.getByText('This branch is inactive')).toBeHidden()
    })

    test('filters the branch list by type', async ({ page, request }) => {
      const { companyId } = await demoCompany(request)

      await page.goto(`/companies/${companyId}/branches`)
      await page.getByRole('combobox', { name: 'Branch Type' }).click()
      await page.getByRole('option', { name: 'Warehouses' }).click()

      await expect(page).toHaveURL(/type=warehouse/)
      await expect(page.getByRole('link', { name: 'Central Warehouse', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Gowa Store', exact: true })).toHaveCount(0)
    })

    test("shows a member's branch access in the members list", async ({ page, request }) => {
      const { companyId } = await demoCompany(request)

      await page.goto(`/companies/${companyId}`)
      await page.getByRole('button', { name: 'Actions for Demo Cashier' }).click()
      await page.getByRole('menuitem', { name: 'Branch Access' }).click()

      const dialog = page.getByRole('dialog', { name: 'Branch Access' })
      await expect(dialog.getByRole('radio', { name: 'Selected Branches' })).toBeChecked()
      await expect(dialog.getByRole('checkbox', { name: /Gowa Store/ })).toBeChecked()
      await expect(dialog.getByRole('checkbox', { name: /Makassar Store/ })).not.toBeChecked()

      // Choosing every branch hides the checklist; cancelling changes nothing.
      await dialog.getByRole('radio', { name: 'All Branches' }).click()
      await expect(dialog.getByRole('checkbox')).toHaveCount(0)
      await dialog.getByRole('button', { name: 'Cancel' }).click()
      await expect(dialog).toBeHidden()
    })
  })

  test.describe('as a cashier restricted to Gowa Store', () => {
    test.use({ storageState: authFile('cashier') })

    test('sees only Gowa Store and no management actions', async ({ page, request }) => {
      const { companyId } = await demoCompany(request)

      await page.goto(`/companies/${companyId}/branches`)
      await expect(page.getByRole('heading', { level: 1, name: 'Branches' })).toBeVisible()
      await expect(page.getByText('The stores and warehouses you can work in.')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Gowa Store', exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Makassar Store', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Add Branch' })).toHaveCount(0)

      await page.getByRole('link', { name: 'Gowa Store', exact: true }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Gowa Store' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Edit Branch' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Deactivate', exact: true })).toHaveCount(0)
    })

    test.describe('opening a branch without access', () => {
      // The API answers 403 BRANCH_ACCESS_DENIED, which the browser logs as a failed request.
      test.use({ failOnConsoleError: false })

      test('shows the access-denied state', async ({ page, request }) => {
        const { companyId, branchIds } = await demoCompany(request)

        await page.goto(`/companies/${companyId}/branches/${branchIds.MKS}`)

        await expect(page.getByText("You don't have access to this branch")).toBeVisible()
        await expect(page.getByRole('link', { name: 'Branches' })).toBeVisible()
      })
    })
  })
})
