import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:9246', channel: 'chrome', headless: true },
  webServer: {
    command: 'npm run dev -- --port 9246',
    url: 'http://127.0.0.1:9246/e2e/',
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
})
