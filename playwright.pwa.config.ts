import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({
  testDir: './tests/pwa',
  outputDir: './test-results/pwa',
  workers: 1,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 } },
  webServer: [
    {
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: 'python3 scripts/serve-standalone.py',
      url: 'http://127.0.0.1:4180',
      reuseExistingServer: false,
    },
  ],
})
