import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.laryn.prototype',
  appName: 'LARYN AI',
  webDir: 'dist-native',
  // Keep all screens bundled in the app; do not point this at a website.
  ios: { contentInset: 'never' },
}
export default config
