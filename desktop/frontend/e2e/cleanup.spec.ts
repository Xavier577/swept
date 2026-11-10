import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/e2e/')
})

test('only reviewed selections reach cleanup, and permanent removal needs explicit acknowledgement', async ({
  page,
}) => {
  await expect(page.getByRole('button', { name: 'Review cleanup' })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: 'Select Credentials' })).toBeDisabled()
  await expect(page.getByText('Protected folder', { exact: true })).toBeVisible()
  await expect(
    page
      .locator('article')
      .filter({ hasText: 'Release archive' })
      .getByText('Review contents', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Not selectable', { exact: true })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Select Package cache' }).check()
  await page.getByRole('button', { name: 'Review cleanup' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Package cache', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Release archive', { exact: true })).toHaveCount(0)
  const clean = dialog.getByRole('button', { name: /Permanently clean/ })
  await expect(clean).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  await clean.click()
  await expect(page.getByRole('status')).toHaveText('permanent: Package cache')
})

test('personal data requires the typed confirmation, while Keep files leaves the selection intact', async ({
  page,
}) => {
  await page.getByRole('checkbox', { name: 'Select Release archive' }).check()
  await page.getByRole('button', { name: 'Review cleanup' }).click()
  await expect(page.getByRole('dialog').getByText('Review contents', { exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('checkbox').check()
  const clean = page.getByRole('button', { name: /Permanently clean/ })
  await expect(clean).toBeDisabled()
  await page.getByRole('textbox', { name: 'Confirm reviewed contents cleanup' }).fill('CLEAN')
  await expect(clean).toBeEnabled()
  await page.getByRole('button', { name: 'Keep files' }).click()
  await expect(page.getByRole('checkbox', { name: 'Select Release archive' })).toBeChecked()
  await expect(page.getByRole('status')).toBeEmpty()
})

test('Trash is a distinct action and the review remains complete when a selected row is filtered out', async ({
  page,
}) => {
  await page.getByRole('checkbox', { name: 'Select Package cache' }).check()
  await page.getByRole('textbox', { name: 'Search items' }).fill('Release')
  await page.getByRole('button', { name: 'Review cleanup' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash', exact: true }).click()
  await expect(
    page.getByText('Space is released when you empty Trash in Finder.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: /Move to Trash 8/ }).click()
  await expect(page.getByRole('status')).toHaveText('trash: Package cache')
})
