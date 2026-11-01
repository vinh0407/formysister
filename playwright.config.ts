import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'

/**
 * Smoke tests for the public routes. The Make preview/dev server is managed
 * outside this config, so set PLAYWRIGHT_BASE_URL when it is not on :3000.
 *
 * AI generation is intentionally not exercised here: it costs a real Workers AI
 * call and requires platform-owned credentials and a Turnstile token.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    locale: 'vi-VN',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
