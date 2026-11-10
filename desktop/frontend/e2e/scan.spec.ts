import { test, expect } from '@playwright/test'

test('refreshing a folder keeps search, sorting, and hidden-file visibility', async ({ page }) => {
  await page.goto('/e2e/scan.html')
  await page.getByRole('button', { name: 'Space explorer', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click()
  await page.getByRole('button', { name: 'Downloads', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search items' }).fill('keep')
  await page.getByRole('combobox', { name: 'Sort', exact: true }).selectOption('name')
  await page.getByRole('checkbox', { name: 'Show hidden files' }).check()
  await page.getByRole('button', { name: 'Refresh sizes', exact: true }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('finish-active-scan')))
  await expect(page.getByRole('button', { name: 'Refresh sizes', exact: true })).toBeEnabled()
  await expect(page.getByRole('textbox', { name: 'Search items' })).toHaveValue('keep')
  await expect(page.getByRole('combobox', { name: 'Sort', exact: true })).toHaveValue('name')
  await expect(page.getByRole('checkbox', { name: 'Show hidden files' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Select keep.txt', exact: true })).toBeVisible()
})

test('cancelling Home unlocks navigation and late replies cannot interrupt a new scan', async ({
  page,
}) => {
  await page.goto('/e2e/scan.html')
  await page.getByRole('button', { name: 'Space explorer', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click()
  await expect(page.getByText('Scan cancelled. Previous results have been kept.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose folder', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Cancel scan', exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Downloads', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Select keep.txt', exact: true }).check()
  await page.getByRole('button', { name: 'Refresh sizes', exact: true }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('deliver-old-scan-events')))
  await expect(page.getByRole('button', { name: 'Cancel scan', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Refresh sizes', exact: true })).toBeDisabled()
  await expect(page.getByText('Obsolete scan progress')).toHaveCount(0)
  await expect(page.getByText('Obsolete request failure')).toHaveCount(0)

  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Select keep.txt', exact: true })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Review cleanup', exact: true })).toBeEnabled()
  await expect(page.getByRole('textbox', { name: 'Folder path' })).toHaveValue(
    '/Users/test/Downloads',
  )

  await page.getByRole('button', { name: 'Home', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click()
  await page.getByRole('button', { name: 'Documents', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Folder path' })).toHaveValue(
    '/Users/test/Documents',
  )
  await expect(page.getByRole('checkbox', { name: 'Select keep.txt', exact: true })).toBeEnabled()
})

test('a failed folder scan releases controls and a subsequent scan succeeds', async ({ page }) => {
  await page.goto('/e2e/scan.html')
  await page.getByRole('button', { name: 'Space explorer', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click()
  const path = page.getByRole('textbox', { name: 'Folder path' })
  await path.fill('/Users/test/missing')
  await page.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(page.getByText('Folder no longer exists.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose folder', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Downloads', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Select keep.txt', exact: true })).toBeEnabled()
  await expect(page.getByText('Folder no longer exists.')).toHaveCount(0)
})

test('a folder waiting for its first measurement can be cancelled', async ({ page }) => {
  await page.goto('/e2e/scan.html')
  await page.getByRole('button', { name: 'Space explorer', exact: true }).click()
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click()
  await page.getByRole('textbox', { name: 'Folder path' }).fill('/Users/test/waiting-for-access')
  await page.getByRole('button', { name: 'Go', exact: true }).click()
  await expect(page.getByText('Starting your scan…')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel scan', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Choose folder', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Downloads', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Select keep.txt', exact: true })).toBeVisible()
})
