import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 960, height: 680 } })

test('one confirmation cleans all reviewed selections, including selections hidden by search', async ({
  page,
}) => {
  await page.goto('/e2e/?managed')
  await page.getByRole('button', { name: 'Find cleanup items' }).click()
  await expect(page.getByRole('button', { name: /Review.*selected/ })).toBeDisabled()
  await page.getByRole('checkbox', { name: 'Select Build cache · app', exact: true }).check()
  await page.getByRole('textbox', { name: 'Find a Docker resource' }).fill('test-db')
  await page.getByRole('checkbox', { name: 'Select all matching resources' }).check()
  await expect(page.getByText('1 hidden by your search; all are included in review.')).toBeVisible()
  await page.getByRole('button', { name: 'Review 2 selected' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Build cache · app', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Volume · test-db', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Container · keep-me', { exact: true })).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Clean 2 selected' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Keep items' }).click()
  await expect(page.getByLabel('Submitted cleanup')).toBeEmpty()
  await page.getByRole('button', { name: 'Review 2 selected' }).click()
  await page.getByRole('textbox', { name: 'Type CLEAN once to confirm' }).fill('CLEAN')
  await page.getByRole('button', { name: 'Clean 2 selected' }).click()
  await expect(page.getByLabel('Submitted cleanup')).toHaveText('CLEAN: cache, volume')
  await expect(page.getByRole('status', { name: 'Cleanup results' })).toContainText(
    '1 removed · 1 needs attention',
  )
  await expect(page.getByRole('status', { name: 'Cleanup results' })).toContainText(
    'This resource is now in use; inspect again.',
  )
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('refresh and select matching do not silently discard hidden selections', async ({ page }) => {
  await page.goto('/e2e/?managed')
  await page.getByRole('button', { name: 'Find cleanup items' }).click()
  await page.getByRole('checkbox', { name: 'Select all matching resources' }).check()
  await page.getByRole('textbox', { name: 'Find a Docker resource' }).fill('test-db')
  await page.getByRole('checkbox', { name: 'Select all matching resources' }).uncheck()
  await expect(page.getByRole('button', { name: 'Review 2 selected' })).toBeEnabled()
  await page.getByRole('button', { name: 'Refresh preview' }).click()
  await page.getByRole('button', { name: 'Keep selection' }).click()
  await expect(page.getByRole('button', { name: 'Review 2 selected' })).toBeEnabled()
  await page.getByRole('button', { name: 'Refresh preview' }).click()
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click()
  await expect(page.getByRole('button', { name: /Review.*selected/ })).toBeDisabled()
  await expect(page.getByLabel('Submitted cleanup')).toBeEmpty()
  await page.getByRole('textbox', { name: 'Find a Docker resource' }).fill('does-not-exist')
  await expect(page.getByText('No matching resources. Try a different search.')).toBeVisible()
})
