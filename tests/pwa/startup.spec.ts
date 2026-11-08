import { test, expect } from '@playwright/test'

test('the complete app works when the server has only index.html', async ({ page, request }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  expect((await request.get('http://127.0.0.1:4180/boot.js')).status()).toBe(404)
  expect((await request.get('http://127.0.0.1:4180/startup.css')).status()).toBe(404)
  await page.goto('http://127.0.0.1:4180/')
  await expect(page.getByRole('heading', { name: 'Your care, at a glance.' })).toBeVisible()
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'Manrope',
  )
  // The UI uses weight 500. Unused weights need not be loaded by fonts.ready.
  await page.evaluate(() => document.fonts.load('500 14px Manrope', 'LARYN'))
  expect(await page.evaluate(() => document.fonts.check('500 14px Manrope', 'LARYN'))).toBe(true)
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Communication', exact: true })
    .click()
  await page.getByRole('button', { name: 'Add phrase', exact: true }).click()
  await page.getByLabel('English', { exact: true }).fill('My app is working')
  await page.getByRole('button', { name: 'Save phrase', exact: true }).click()
  await expect(page.getByRole('button', { name: 'My app is working', exact: true })).toBeVisible()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Device & data', exact: true })
    .click()
  await expect(
    page.getByText(
      'The offline copy could not be saved. Try reloading while connected to the internet.',
    ),
  ).toBeVisible()
  await page.getByRole('button', { name: 'ไทย', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'LARYN บน iPhone ของคุณ' })).toBeVisible()
  expect(errors).toEqual([])
})

test('the app opens as a standalone local HTML file', async ({ page }) => {
  const { resolve } = await import('node:path')
  const { pathToFileURL } = await import('node:url')
  try {
    await page.goto(pathToFileURL(resolve('dist/index.html')).href)
  } catch (error) {
    if (String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR')) {
      test.skip(
        true,
        'Managed Chromium blocks file URLs. HTTP single-file serving is tested separately.',
      )
      return
    }
    throw error
  }
  await expect(page.getByRole('heading', { name: 'Your care, at a glance.' })).toBeVisible()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Communication', exact: true })
    .click()
  await page.getByLabel('Your message').fill('Hello from LARYN')
  await expect(page.getByRole('button', { name: 'Speak message', exact: true })).toBeEnabled()
})

test('a React startup failure shows a retry screen and preserves saved phrases', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'laryn-phrases',
      '[{"id":"saved","en":"Stay with me","th":"","icon":"chat","custom":true}]',
    )
    Object.defineProperty(window, 'ResizeObserver', {
      value: class {
        constructor() {
          throw new Error('Simulated browser startup failure')
        }
      },
    })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'LARYN could not start' })).toBeVisible()
  await page.getByText('Error details to share').click()
  await expect(page.getByText('Simulated browser startup failure', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('laryn-phrases'))).toContain('Stay with me')
})

test('disabled JavaScript still gives readable instructions', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  try {
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:4173/')
    await expect(page.getByText(/Enable JavaScript in your browser to use LARYN/)).toBeVisible()
  } finally {
    await context.close()
  }
})
