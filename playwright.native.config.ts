import { defineConfig } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({
  testDir: './tests/native',
  outputDir: './test-results/native',
  workers: 1,
  use: {
    ...base.use,
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command:
      'npm run build:native && npm run preview -- --outDir dist-native --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
