import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/** Make the loading screen independent of any secondary network request. */
export function inlineStartup(): Plugin {
  const read = (name: string) => readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8')
  return {
    name: 'laryn:inline-startup',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const logo = `data:image/svg+xml;base64,${Buffer.from(read('favicon.svg')).toString('base64')}`
        return html
          .replace(
            '<link rel="stylesheet" href="/startup.css" />',
            `<style>${read('startup.css')}</style>`,
          )
          .replace(
            '<script src="/boot.js"></script>',
            `<script>${read('boot.js').replace(/<\/script/gi, '<\\/script')}</script>`,
          )
          .replaceAll('"/favicon.svg"', `"${logo}"`)
      },
    },
  }
}
