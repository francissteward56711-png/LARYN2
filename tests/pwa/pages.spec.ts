import { test, expect } from '@playwright/test'

test('GitHub Pages subdirectory supports icons, scoped installation, and offline reopening', async ({
  page,
  context,
  request,
}) => {
  const origin = 'http://127.0.0.1:4180'
  const prefix = `${origin}/STUFF/`
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(prefix)
  await expect(page.getByRole('heading', { name: 'Your care, at a glance.' })).toBeVisible()
  const manifestUrl = await page
    .locator('link[rel="manifest"]')
    .evaluate((el: HTMLLinkElement) => el.href)
  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .evaluate((el: HTMLLinkElement) => el.href)
  expect(manifestUrl).toBe(`${prefix}manifest.webmanifest`)
  expect(appleIcon).toBe(`${prefix}apple-touch-icon.png`)
  expect((await request.get(appleIcon)).ok()).toBe(true)
  const manifest = await (await request.get(manifestUrl)).json()
  expect(new URL(manifest.scope, manifestUrl).href).toBe(prefix)
  expect(new URL(manifest.id, manifestUrl).href).toBe(prefix)
  for (const icon of manifest.icons) {
    const url = new URL(icon.src, manifestUrl).href
    expect(url.startsWith(prefix)).toBe(true)
    expect((await request.get(url)).ok()).toBe(true)
  }
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(scope).toBe(prefix)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  const reopened = await context.newPage()
  await reopened.goto(new URL(manifest.start_url, manifestUrl).href)
  await expect(reopened.getByRole('heading', { name: 'Your care, at a glance.' })).toBeVisible()
  await reopened
    .getByRole('navigation')
    .getByRole('button', { name: 'Communication', exact: true })
    .click()
  await reopened.getByRole('button', { name: 'ไทย', exact: true }).click()
  await expect(reopened.getByRole('heading', { name: 'ทุกเสียงมีความหมาย' })).toBeVisible()
  expect(errors).toEqual([])
})
