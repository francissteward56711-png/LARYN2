import { test, expect } from '@playwright/test'

test('production manifest and PNG icons provide Home Screen metadata', async ({
  page,
  request,
}) => {
  await page.goto('/')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    './manifest.webmanifest',
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    './apple-touch-icon.png',
  )
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    'content',
    'yes',
  )
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest).toMatchObject({
    name: 'LARYN AI',
    short_name: 'LARYN',
    display: 'standalone',
    start_url: './?source=homescreen',
    scope: './',
    id: './',
  })
  for (const [url, size] of [
    ['/apple-touch-icon.png', 180],
    ['/icons/icon-192.png', 192],
    ['/icons/icon-512.png', 512],
    ['/icons/maskable-512.png', 512],
  ] as const) {
    const icon = await request.get(url)
    expect(icon.ok()).toBe(true)
    const bytes = await icon.body()
    expect(bytes.subarray(1, 4).toString()).toBe('PNG')
    expect(bytes.readUInt32BE(16)).toBe(size)
    expect(bytes.readUInt32BE(20)).toBe(size)
  }
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Device & data', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'LARYN on your iPhone' })).toBeVisible()
  await expect(page.getByText(/Tap Share, then Add to Home Screen/)).toBeVisible()
  await page.getByRole('button', { name: 'ไทย', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'LARYN บน iPhone ของคุณ' })).toBeVisible()
})

test('app reopens offline, keeps phrases, and labels new alerts as local', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Device & data', exact: true })
    .click()
  await expect(page.getByText('Saved for offline opening', { exact: true })).toBeVisible()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Communication', exact: true })
    .click()
  await page.getByRole('button', { name: 'Add phrase', exact: true }).click()
  await page.getByLabel('English', { exact: true }).fill('Please stay with me')
  await page.getByRole('button', { name: 'Save phrase', exact: true }).click()
  await context.setOffline(true)
  const reopened = await context.newPage()
  await reopened.goto('/?source=homescreen')
  await expect(reopened.getByRole('heading', { name: 'Your care, at a glance.' })).toBeVisible()
  await expect(reopened.getByText(/You’re offline. Saved app pages/)).toBeVisible()
  await reopened
    .getByRole('navigation')
    .getByRole('button', { name: 'Communication', exact: true })
    .click()
  await expect(
    reopened.getByRole('button', { name: 'Please stay with me', exact: true }),
  ).toBeVisible()
  await reopened
    .getByRole('navigation')
    .getByRole('button', { name: 'Device & data', exact: true })
    .click()
  await reopened.getByLabel('Import sensor CSV').setInputFiles({
    name: 'offline.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('timestamp_ms,ax,ay,az,gx,gy,gz\n0,0,0,1,0,0,0\n50,0,0,1.3,0,0,0'),
  })
  await reopened.getByRole('button', { name: 'View recording' }).click()
  await expect(reopened.getByText('UNCLASSIFIED', { exact: true })).toBeVisible()
  await reopened
    .getByRole('navigation')
    .getByRole('button', { name: 'Alerts', exact: true })
    .click()
  await reopened.getByRole('button', { name: 'Run alert demo', exact: true }).click()
  await expect(reopened.getByText('Demo alert created. No notification was sent.')).toBeVisible()
  await reopened.reload()
  await reopened
    .getByRole('navigation')
    .getByRole('button', { name: 'Alerts', exact: true })
    .click()
  await expect(reopened.getByText('No open requests', { exact: true })).toBeVisible()
  await context.setOffline(false)
  await expect(reopened.getByText(/You’re offline/)).toHaveCount(0)
})

test('offline setup failure is shown without blocking communication', async ({ page }) => {
  // Browser routing does not consistently intercept the service-worker script.
  // Simulate a rejected registration; the preceding test uses the real worker.
  await page.addInitScript(() => {
    Object.defineProperty(navigator.serviceWorker, 'register', {
      value: () => Promise.reject(new DOMException('Registration unavailable', 'SecurityError')),
    })
  })
  await page.goto('/')
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Device & data', exact: true })
    .click()
  await expect(
    page.getByText(
      'The offline copy could not be saved. Try reloading while connected to the internet.',
    ),
  ).toBeVisible()
  await page
    .getByRole('navigation')
    .getByRole('button', { name: 'Communication', exact: true })
    .click()
  await page.getByLabel('Your message').fill('I would like to rest')
  await expect(page.getByRole('button', { name: 'Speak message', exact: true })).toBeEnabled()
})
