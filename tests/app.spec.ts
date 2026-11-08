import { test, expect } from '@playwright/test'
test('overview, replay controls, and navigation render without overflow', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your care, at a glance.' })).toBeVisible()
  await expect(page.getByText('Not connected', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByText('Replay paused')).toBeVisible()
  await page.getByRole('button', { name: 'Resume', exact: true }).click()
  await expect(page.getByText('Demo replay', { exact: true })).toBeVisible()
  for (const name of ['Communication', 'Swallowing', 'Alerts', 'Device & data', 'Overview']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(errors).toEqual([])
})
test('custom phrases persist and text-to-speech uses the selected language', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: (utterance: SpeechSynthesisUtterance) => {
          document.body.dataset.spoken = utterance.text
          document.body.dataset.spokenLang = utterance.lang
          utterance.onstart?.(new Event('start') as SpeechSynthesisEvent)
        },
      },
    })
  })
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: 'Communication' }).click()
  await page.getByRole('button', { name: 'Add phrase' }).click()
  await page.getByLabel('English', { exact: true }).fill('Please open the window')
  await page.getByLabel('ภาษาไทย', { exact: true }).fill('ช่วยเปิดหน้าต่างหน่อย')
  await page.getByRole('button', { name: 'Save phrase' }).click()
  await page.getByRole('button', { name: 'Please open the window ช่วยเปิดหน้าต่างหน่อย' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-spoken', 'Please open the window')
  await expect(page.getByRole('button', { name: 'Stop speaking', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Stop speaking', exact: true }).click()
  await page.reload()
  await page.getByRole('navigation').getByRole('button', { name: 'Communication' }).click()
  await expect(
    page.getByRole('button', { name: 'Please open the window ช่วยเปิดหน้าต่างหน่อย' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'ไทย', exact: true }).click()
  await page.getByRole('button', { name: 'ช่วยเปิดหน้าต่างหน่อย Please open the window' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-spoken-lang', 'th-TH')
  await expect(page.locator('html')).toHaveAttribute('lang', 'th')
  await page.getByRole('button', { name: 'ลบ ช่วยเปิดหน้าต่างหน่อย', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'ช่วยเปิดหน้าต่างหน่อย Please open the window' }),
  ).toHaveCount(0)
})
test('demo and help alerts remain local and can be reviewed and resolved', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: 'Alerts', exact: true }).click()
  await page.getByRole('button', { name: 'Run alert demo' }).click()
  await expect(page.getByText('Simulated motion change', { exact: true })).toBeVisible()
  await expect(page.getByText('Demo alert created. No notification was sent.')).toBeVisible()
  await page.getByRole('button', { name: 'Acknowledge', exact: true }).click()
  await expect(page.getByText(/Acknowledged on this device/)).toBeVisible()
  await page.getByRole('button', { name: 'Resolve', exact: true }).click()
  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page.getByText('Simulated motion change', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Resolved', exact: true }).click()
  await expect(page.getByText('Simulated motion change', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Request help', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('It does not notify a caregiver')
  await page.getByRole('button', { name: 'Show local help request' }).click()
  await expect(page.getByText('Help requested', { exact: true })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Overview' }).click()
  await expect(
    page.getByText('1 local request to review. No external notifications have been sent.'),
  ).toBeVisible()
})
test('CSV import validates data, charts it without diagnosis, and exports a recording', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('navigation').getByRole('button', { name: 'Device & data' }).click()
  await page.getByLabel('Import sensor CSV').setInputFiles({
    name: 'bad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('wrong,columns\n1,2'),
  })
  await expect(page.getByRole('alert')).toContainText('CSV header must be')
  const csv = 'timestamp_ms,ax,ay,az,gx,gy,gz\n0,0,0,1,0,0,0\n50,0,0,1.4,1,2,3\n100,0,0,1,0,0,0\n'
  await page
    .getByLabel('Import sensor CSV')
    .setInputFiles({ name: 'sensor.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.getByRole('button', { name: 'View recording' }).click()
  await expect(page.getByText('UNCLASSIFIED', { exact: true })).toBeVisible()
  await expect(page.getByText('Recorded samples', { exact: true })).toBeVisible()
  await expect(page.getByText('Swallow 06', { exact: true })).toHaveCount(0)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('laryn-recording.csv')
  await page.getByRole('navigation').getByRole('button', { name: 'Device & data' }).click()
  await page.getByRole('button', { name: 'Return to demo' }).click()
  await expect(page.getByText('Demo selected', { exact: true })).toBeVisible()
})
test('Thai layout and dialogs remain usable on every screen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'ไทย', exact: true }).click()
  for (const name of ['การสื่อสาร', 'การกลืน', 'แจ้งเตือน', 'อุปกรณ์', 'ภาพรวม']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: 'ขอความช่วยเหลือ', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'th')
})

test('key screens and active alert states pass automated accessibility checks', async ({
  page,
}) => {
  test.setTimeout(90000)
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await page.goto('/')
  for (const name of ['Overview', 'Communication', 'Swallowing', 'Alerts', 'Device & data']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click()
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations, name).toEqual([])
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Alerts', exact: true }).click()
  await page.getByRole('button', { name: 'Run alert demo' }).click()
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    'Active alert',
  ).toEqual([])
  await page.getByRole('button', { name: 'Request help', exact: true }).click()
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
    'Help dialog',
  ).toEqual([])
})
