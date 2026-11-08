# LARYN AI

**Your voice, supported.** An English/Thai prototype for speech assistance, throat-motion exploration, and local caregiver alert workflows. Includes a responsive web interface and a Capacitor iOS app with bundled screens, native speech, and CSV sharing.

ชื่อภาษาไทย: นวัตกรรมอุปกรณ์สวมใส่อัจฉริยะสำหรับช่วยการสื่อสาร ตรวจติดตามการกลืน และแจ้งเตือนเหตุฉุกเฉินด้วยปัญญาประดิษฐ์

## iPhone app from Windows

Follow [the Windows installation guide](docs/ios-without-mac.md). The prepared `artifacts/LARYN-iOS-source.zip` contains the source and a manual GitHub Actions workflow. A standard cloud Mac runner builds an unsigned device IPA in a **public repository**. AltStore Classic on Windows then signs and installs it using your free Apple account. No owned Mac, website hosting, or paid Apple Developer membership is needed. Free signing normally needs renewal every seven days.

The project is prepared locally. Nothing has been pushed or published, and an IPA has not yet been compiled. The first cloud Xcode build and physical iPhone checks remain necessary. The workflow deliberately skips private repositories to avoid consuming paid runner minutes.

## Run the app

Use Node.js 22+ (developed with Node 24) and npm. From the existing checkout:

```sh
cd /workspace/STUFF
npm ci
npm run dev
```

The development server listens on port 5173. This is a development process, not a public deployment. No API keys, database, or external service configuration is needed. Use the existing cloud checkout; a separate Git worktree is not needed.

```sh
npm run build       # TypeScript checks and production build into dist/
npm run preview     # Serve the production build for local inspection
npm test            # Sensor parsing and processing tests
npm run test:e2e    # Chromium desktop/phone interaction and accessibility checks
npm run test:pwa    # Production manifest, offline reopening, and cache failure checks
npm run test:native # Native bundle with a mocked iPhone bridge
npm run ios:sync    # Bundle screens and update the native Xcode project/plugins
npm run package:ios # Prepare source ZIP for a manual GitHub cloud build
npm run package:iphone # Build a static-site upload ZIP (requires Python 3)
npm run format:check
```

Browser tests use `/usr/bin/chromium` when available. Else install the Playwright browser with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an installed Chromium executable. Automated speech tests mock the browser speech engine; actual audio and installed voices require a check on the target device.

## Optional web version

Production `index.html` now embeds the app code, styles, fonts, and startup graphics, so a missing asset folder cannot prevent the main interface from opening. The file is also available at `artifacts/index.html`. Opening local HTML is subject to browser policy; the cloud browser blocks that check. Serving only this file over HTTP is covered by the production tests. Upload the full ZIP to keep Home Screen and offline support.

The app includes a Home Screen manifest, iPhone and maskable icons, offline loading after the first online visit, and an update prompt that asks before reloading. The uploadable website is `artifacts/laryn-iphone-app.zip` after running `npm run package:iphone`.

Follow [the free GitHub Pages installation guide](docs/iphone-install.md) to upload `artifacts/LARYN-GitHub-Pages.zip` contents to a public deployment repository, enable Pages, and add LARYN from Safari. The included `github.io` address avoids a custom domain purchase. No paid Apple Developer membership is needed. The package is prepared locally; it is not publicly deployed. Physical iPhone installation and speech output still need device testing.

## What works

- **Overview:** a labeled 60-second synthetic recording, moving playback cursor, session metrics, and quick communication buttons.
- **Communication:** English/Thai text-to-speech using native voices on iOS and browser speech on the web, editable messages, custom phrases, stop control, speed selection, and session message history. System voice availability varies by device.
- **Swallowing:** motion chart with 30/60-second windows, predefined demo event labels, raw CSV import, and CSV export (native share sheet on iOS). Imported recordings show raw signal metrics without swallowing labels or diagnoses.
- **Alerts:** manually create a demo event or a local help request, acknowledge it, resolve it, and filter history. Nothing is sent to another device, caregiver, or emergency service.
- **Device & data:** wearable concept, accurate disconnected status, documented CSV format, example download, input validation, and return-to-demo control.
- **Responsive UI:** laptop/tablet/phone layouts, Thai/English interface, keyboard-operable native dialogs, visible focus, reduced-motion support, and bundled fonts.

## Data and limitations

This is a research/product prototype, not a clinical monitor. There is no trained AI model, live ESP32 connection, choking detection, or determination of safe swallowing. The built-in event labels are simulated, not predictions. The alert list represents requests created in the UI, not the user's health status.

CSV processing runs on the device; the application does not upload recordings. Imported data, spoken-message history, and alerts are held in memory and clear when the app reloads. Language and custom phrases use local storage when available. Native exports temporarily use the app cache and remove the copy after sharing or cancellation; the chosen share destination receives the exported file. There is no login or device-to-device synchronization. The operating system's text-to-speech implementation may use its own online voices.

The interface is suitable for exploring the concept and demonstrating the interaction flows. Actual use for care needs hardware integration, validated acquisition and signal interpretation, reliable delivery and acknowledgment of alerts, and appropriate clinical evaluation.

## Code map

- `src/App.tsx` — the five screens and interaction state.
- `src/components/SignalChart.tsx` — responsive motion chart and demo cursor.
- `src/components/Modal.tsx` — native modal dialog with keyboard focus containment.
- `src/data.ts` — typed samples, synthetic recording, CSV import/export, signal summary, local preference validation.
- `src/native/speech.ts`, `src/export.ts` — native speech cancellation and CSV sharing, with browser export fallback.
- `capacitor.config.ts`, `ios/` — iOS project, icons, shared scheme, and file-access privacy declaration.
- `.github/workflows/ios-build.yml` — manual unsigned iPhone build on a standard cloud Mac runner.
- `scripts/package-ipa.py`, `scripts/package-ios-source.py` — device IPA validation and source ZIP creation.
- `src/styles.css` — responsive layout and visual design.
- `src/components/Pwa.tsx` — installation instructions, offline status, and update prompt.
- `vite.config.ts` — self-contained HTML output, relative manifest paths, and production service-worker generation.
- `scripts/package-web.py` — verified upload ZIP creation.
- `tests/pwa/` — production offline, startup, standalone-file serving, and GitHub Pages subdirectory checks.
- `tests/native/` — packaged screens, native dispatch, and canceled sharing with a mocked iPhone bridge.
- `src/data.test.ts`, `tests/app.spec.ts` — data validation and browser workflows.
- [Sensor data contract](docs/sensor-data.md) — units, limits, and what the chart means.

## Next integration steps

1. Record synchronized, timestamped MPU6050 acceleration and rotation through the ESP32-C3. Check units and sampling behavior using CSV recordings first.
2. Add an authenticated ingestion service and explicit live/stale/disconnected states. Firmware endpoints and credentials are not implemented in this version.
3. Collect consented, labeled data to evaluate whether personalized, closed-vocabulary phrase recognition and swallowing-event detection are feasible. Do not treat motion magnitude as an emergency classifier or a general speech decoder.
4. Connect persistent caregiver accounts and a tested notification transport, with delivery and acknowledgment states. Keep synthetic demonstrations distinct from real events.

No deployment or repository push is performed by the app setup commands.
