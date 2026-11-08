import { chromium } from '@playwright/test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  args: ['--no-sandbox'],
})
try {
  const page = await browser.newPage()
  const svg = readFileSync(new URL('../public/icons/source.svg', import.meta.url), 'utf8')
  for (const [path, size] of [
    ['apple-touch-icon.png', 180],
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
    ['icons/maskable-512.png', 512],
    ['../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024],
  ]) {
    const png = await page.evaluate(
      async ({ svg, size }) => {
        const image = new Image()
        image.src = 'data:image/svg+xml;base64,' + btoa(svg)
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, size, size)
        return canvas.toDataURL('image/png').split(',')[1]
      },
      { svg, size },
    )
    // iOS icons must be RGB: some browsers still encode an opaque canvas as RGBA.
    const decoded = PNG.sync.read(Buffer.from(png, 'base64'))
    const rgb = PNG.sync.write(decoded, { colorType: 2 })
    writeFileSync(new URL('../public/' + path, import.meta.url), rgb)
    console.log(`Generated ${path} (${size} × ${size})`)
  }
} finally {
  await browser.close()
}
