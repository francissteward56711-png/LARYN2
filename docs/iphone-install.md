# Install LARYN on iPhone for free

This guide is for the optional **web app**. For the bundled iOS app built on a cloud Mac and installed from Windows, use [the AltStore Classic guide](ios-without-mac.md).

Use GitHub Pages with a **public repository** and GitHub's included `github.io` address. This prototype can be hosted on GitHub's free plan, then installed from Safari as a Home Screen web app. A Mac, custom domain purchase, or paid Apple Developer membership is not required.

## Publish the prepared website

The package is `artifacts/LARYN-GitHub-Pages.zip`. It contains the built website and installation/offline files. The app code, design, and fonts are embedded in `index.html`, so a missing asset folder cannot stop the main interface from opening.

1. Download and unzip `LARYN-GitHub-Pages.zip` on your computer.
2. On [GitHub's new repository page](https://github.com/new), create a **public** repository named **LARYN**. A separate deployment repository lets your existing `STUFF` source repository keep its current visibility. The built website files will be public.
3. Open that repository and choose **uploading an existing file**, or **Add file → Upload files**. Upload all the contents of the extracted folder, including `index.html`, `icons/`, and `sw.js`, then commit the upload to `main`. Upload the contents, not the ZIP and not an extra outer folder: `index.html` must appear directly in the repository's file list.
4. Open **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, choose **main** and **/(root)**, then **Save**.
5. Wait for GitHub to report that the site is deployed, then use the website link shown on the Pages screen. For the `francissteward56711-png` account and repository `LARYN`, the expected address is `https://francissteward56711-png.github.io/LARYN/`. This is an expected address, not a currently verified deployment.

Use the repository's included `github.io` address to keep this route free. GitHub Pages on a private repository can require a paid plan; use the separate public deployment repository rather than upgrading for this prototype.

The build works at the root of a site and under repository paths such as `/LARYN/` or `/STUFF/`. Manifest, icon, app-start, and service-worker paths resolve within the chosen repository. `.nojekyll` is included so GitHub serves the generated site directly.

## Add it to your iPhone

1. Open the live Pages website link in **Safari** on iPhone or iPad.
2. Wait for the first load. Under **Device & data**, check for **Saved for offline opening**.
3. Tap **Share → Add to Home Screen**. If iOS offers **Open as Web App**, leave it enabled.
4. Tap **Add** and open **LARYN** using its new icon.
5. Visit **Device & data** inside the installed app and let its offline copy finish saving too. Safari and the installed app can have separate storage.

No App Store listing is created. The installed app has its own Home Screen icon and standalone window.

## Check it on your iPhone

- Select Thai or English in Communication and try a phrase with device audio enabled. Voices are provided by iOS; some require downloads or internet access.
- Add a custom phrase and reopen the installed app to check that it remains.
- After offline setup is confirmed, try reopening in airplane mode. Cached pages and saved phrases remain available while the browser keeps its storage.
- When an update appears, use **Reload app** after exporting any recording you want to retain. Recordings and alert history clear on reload.

Automated Chromium checks cover the build served under a repository subdirectory, manifest/icon resolution, scoped service-worker registration, offline reopening, and startup failures. Apple's installation UI and actual iPhone audio still need device testing. Local `file://` testing is blocked by the managed cloud browser; serving only `index.html` over HTTP is tested separately.

## Updating the website

Rebuild the package and upload its new contents to the same public repository and branch. GitHub Pages will redeploy. Keeping the same website address preserves the app's origin and local preferences. Open the website online to let it detect updates.

## Rebuild the package

From `/workspace/STUFF`, with Node.js 22+ and Python 3:

```sh
npm ci
npm run package:iphone
```

This writes the upload ZIP and a standalone `artifacts/index.html`. It verifies that the main page does not require an external JavaScript or stylesheet file. It does not push files, change repository visibility, enable Pages, or publish a site.

Run `npm run test:pwa` to test the production build, including the GitHub Pages subdirectory case. `npm run dev` intentionally does not enable service-worker caching.

## Current app capabilities

Installing supplies an icon, a standalone window, and offline app pages after setup. Live hardware streaming, a trained AI model, remote caregiver alerts, and device-to-device synchronization still require implementation. The prototype uses synthetic or imported data and does not provide clinical or background emergency monitoring.

Custom phrases are stored in the current browser/app. Imported recordings and alert history last for the session. The application does not upload these to the deployment repository. Browser storage can be cleared or evicted, so offline setup does not guarantee indefinite offline availability.
