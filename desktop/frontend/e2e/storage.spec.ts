import { test, expect } from '@playwright/test'

test('storage is measured automatically without engine inspection or offering disk-image deletion', async ({
  page,
}) => {
  await page.goto('/e2e/?offline')
  await expect(page.getByRole('heading', { name: 'Storage on your Mac' })).toBeVisible()
  await expect(page.getByText('8 KiB', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Storage footprint')).toBeVisible()
  await expect(page.getByText('1 TiB', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Choose cleanup items' })).toBeVisible()
  await expect(page.getByRole('button', { name: /delete|remove/i })).toHaveCount(0)
  await page.getByRole('button', { name: 'Refresh storage' }).click()
  await expect(page.getByRole('status')).toContainText('Storage checked — size unchanged.')
  await expect(page.getByText('8 KiB', { exact: true })).toHaveCount(2)
})
