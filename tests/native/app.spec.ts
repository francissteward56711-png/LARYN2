import { test, expect } from '@playwright/test'

type NativeCall = { plugin: string; method: string; options?: Record<string, unknown> }
declare global {
  interface Window {
    larynNativeCalls: NativeCall[]
    larynCancelShare: boolean
  }
}

// Exercise the production native bundle and the real Capacitor JS dispatch.
// Hardware audio, UIKit sharing, and installation still need an actual iPhone.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.larynNativeCalls = []
    const host = window as unknown as Record<string, unknown>
    host.webkit = { messageHandlers: { bridge: {} } }
    let finishSpeech: (() => void) | undefined
    host.Capacitor = {
      PluginHeaders: Object.entries({
        TextToSpeech: ['speak', 'stop', 'isLanguageSupported', 'getSupportedVoices'],
        Filesystem: ['writeFile', 'deleteFile'],
        Share: ['share'],
      }).map(([name, methods]) => ({
        name,
        methods: methods.map((name) => ({ name, rtype: 'promise' })),
      })),
      nativePromise: async (plugin: string, method: string, options?: Record<string, unknown>) => {
        window.larynNativeCalls.push({ plugin, method, options })
        if (method === 'getSupportedVoices') return { voices: [] }
        if (method === 'isLanguageSupported') return { supported: true }
        if (method === 'speak')
          return new Promise<void>((resolve) => {
            finishSpeech = resolve
          })
        if (method === 'stop') {
          finishSpeech?.()
          return
        }
        if (method === 'writeFile') return { uri: 'file:///cache/export.csv' }
        if (method === 'share' && window.larynCancelShare) throw new Error('Share canceled')
        return {}
      },
    }
    Object.defineProperty(window, 'speechSynthesis', { value: undefined })
  })
})

test('native bundle opens all screens without remote assets or service workers', async ({
  page,
}) => {
  const errors: string[] = []
  const remote: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4174/'))
      remote.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your care, at a glance.' })).toBeVisible()
  for (const name of ['Communication', 'Swallowing', 'Alerts', 'Device & data']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await expect(page.getByText('Included in the app', { exact: true })).toBeVisible()
  await expect(page.getByText(/Open your hosted LARYN link/)).toHaveCount(0)
  await expect(page.locator('html')).toHaveClass(/native-app/)
  expect(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
  ).toBe(0)
  expect(errors).toEqual([])
  expect(remote).toEqual([])
})

test('Thai speech goes through the native plugin and can be stopped', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Communication', exact: true })
    .click()
  await page.getByRole('button', { name: 'ไทย', exact: true }).click()
  const phrase = page.locator('.phrase-card').first()
  await phrase.click()
  await expect
    .poll(() =>
      page.evaluate(
        () => window.larynNativeCalls.filter((c) => c.method === 'speak').at(-1)?.options?.lang,
      ),
    )
    .toBe('th-TH')
  await expect(page.locator('.speaking-indicator')).toBeVisible()
  const count = await page.evaluate(
    () => window.larynNativeCalls.filter((c) => c.method === 'stop').length,
  )
  await page.locator('.speaking-indicator button').click()
  await expect
    .poll(() =>
      page.evaluate(() => window.larynNativeCalls.filter((c) => c.method === 'stop').length),
    )
    .toBe(count + 1)
  await expect(page.locator('.speaking-indicator')).toHaveCount(0)
})

test('CSV export uses native sharing and normal cancellation stays quiet', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Swallowing', exact: true })
    .click()
  await page.evaluate(() => {
    window.larynCancelShare = true
  })
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => window.larynNativeCalls.some((c) => c.method === 'deleteFile')))
    .toBe(true)
  const calls = await page.evaluate(() => window.larynNativeCalls)
  expect(calls.find((c) => c.method === 'writeFile')?.options?.data).toMatch(
    /^timestamp_ms,ax,ay,az,gx,gy,gz/,
  )
  expect(calls.find((c) => c.method === 'share')?.options?.url).toBe('file:///cache/export.csv')
  await expect(page.getByText(/Export failed/)).toHaveCount(0)
})
