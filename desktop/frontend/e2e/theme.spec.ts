import { test, expect } from '@playwright/test'

test('appearance changes immediately, persists, and leaves folder edits unsaved', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/e2e/scan.html')
  await page.getByRole('button', { name: 'Preferences', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeDisabled()
  await page.getByRole('button', { name: 'Add folder', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeEnabled()
  await expect(page.getByText('/Users/test/Projects', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 248, 251)')
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('/Users/test/Projects', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 248, 251)')
  await page.getByRole('button', { name: 'Preferences', exact: true }).click()
  await expect(page.getByText('No project folders selected.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeDisabled()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(21, 28, 38)')
  await page.getByRole('button', { name: 'System', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(246, 248, 251)')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(21, 28, 38)')
})

test('a failed appearance save restores the saved theme and explains the failure', async ({
  page,
}) => {
  await page.goto('/e2e/scan.html?theme-error')
  await page.getByRole('button', { name: 'Preferences', exact: true }).click()
  await page.getByRole('button', { name: 'Light', exact: true }).click()
  await expect(page.getByText('Could not save appearance.', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(21, 28, 38)')
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toBeEnabled()
})
