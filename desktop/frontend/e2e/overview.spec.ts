import { test, expect } from '@playwright/test'

test('overview reviews a mixed-category selection together even when one category is hidden', async ({
  page,
}) => {
  await page.goto('/e2e/?overview')
  await page.getByRole('checkbox', { name: 'Select Package cache' }).check()
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('xcode')
  await page.getByRole('checkbox', { name: 'Select Release archive' }).check()
  await page.getByRole('button', { name: 'Review 2 selected' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Package cache', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Release archive', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Credentials', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Keep files' }).click()
  await expect(page.getByRole('checkbox', { name: 'Select Release archive' })).toBeChecked()
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('all')
  await expect(page.getByRole('checkbox', { name: 'Select Package cache' })).toBeChecked()
})

test('expected skips are informational and permission help appears only for access failures', async ({
  page,
}) => {
  await page.goto('/e2e/?notices')
  await page.getByText('1 location skipped by design').click()
  await expect(page.getByText('/Users/test/OrbStack:', { exact: false })).toBeVisible()
  await expect(page.getByText('scan warning', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Full Disk Access', { exact: false })).toHaveCount(0)
  await page.goto('/e2e/?notices&failure')
  await page.getByText('1 scan warning', { exact: false }).click()
  await expect(page.getByText('File disappeared during scan')).toBeVisible()
  await expect(page.getByText('Full Disk Access', { exact: false })).toHaveCount(0)
  await page.goto('/e2e/?notices&permission')
  await page.getByText('1 scan warning', { exact: false }).click()
  await expect(page.getByText('Full Disk Access', { exact: false })).toBeVisible()
})
