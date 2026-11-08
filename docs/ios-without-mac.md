# LARYN on iPhone, using Windows

The project includes an iOS app that bundles LARYN's screens, native iPhone speech, and CSV sharing. You can build it using GitHub's cloud Mac and install it from Windows with **AltStore Classic**. You do not need to own a Mac or buy an Apple Developer membership. The interface is built with React inside Capacitor; Xcode compiles the iOS container and plugins.

**The download `LARYN-iOS-source.zip` contains source code. It is not an installable app yet.** The GitHub build below produces `LARYN-unsigned.ipa`. AltStore signs that file using your Apple account for your own phone. Nothing has been uploaded or published by this setup.

## 1. Put the source on GitHub

1. Download and extract **LARYN-iOS-source.zip** on Windows.
2. Sign in to [GitHub](https://github.com/new) and create a **public** repository named **LARYN-iOS**. Use a separate repository so the existing STUFF repository keeps its current visibility. All source uploaded to this new repository becomes public. Only the prototype and synthetic examples belong in this upload.
3. Choose **uploading an existing file** or **Add file → Upload files**. Drag in the extracted contents, including `.github`, `ios`, `src`, and `package.json`. Commit them to `main`. Upload the contents, not the ZIP or an extra enclosing folder. `package.json` must appear in the repository's top-level file list.
4. Check that `.github/workflows/ios-build.yml` is present. If Windows hides dot folders, enable **View → Show → Hidden items** before selecting the files.

Standard GitHub-hosted runners are free for public repositories. This workflow uses the standard `macos-15` runner and intentionally skips private repositories. Do not choose a larger paid runner. No GitHub Pages or website deployment is involved.

## 2. Build the iPhone file

1. Open the repository's **Actions** tab. Enable Actions if GitHub prompts you.
2. Select **Build LARYN for iPhone → Run workflow → Run workflow** on `main`.
3. Wait for the run to finish successfully. It checks the app, bundles its screens, compiles with Xcode, and packages a device build.
4. Open the successful run and download the **LARYN-iPhone-unsigned** artifact at the bottom of the page. Unzip it to find **LARYN-unsigned.ipa**. Download within seven days, or run the workflow again.

No Apple credentials, certificates, or GitHub secrets are needed for this build. If it fails, open the red step and save its error text; the Xcode log is also saved as **LARYN-build-log** when available. A skipped run usually means the repository is private. The source and web bundle were checked in Linux; an actual Xcode compile still needs this first cloud run.

### If Actions shows no workflow

Open the repository's **Code** tab first. It needs `package.json`, `package-lock.json`, `src/`, `ios/`, and `.github/workflows/ios-build.yml` at the repository root. If it only has `index.html`, `sw.js`, icons, and a manifest, it contains the earlier website upload. Upload the complete **iOS source ZIP** contents to this repository; the website ZIP cannot build an iPhone IPA.

If the source files are present but `.github` was missed during upload:

1. Choose **Code → Add file → Create new file** on the repository's default branch (normally `main`).
2. Enter the complete filename **`.github/workflows/ios-build.yml`**.
3. Open **LARYN-iPhone-workflow.txt** from the source ZIP in Notepad. Copy all its contents into GitHub's file editor.
4. Commit the file to the default branch, then refresh **Actions**. **Build LARYN for iPhone** should appear.

`LARYN-iPhone-workflow.txt` is a visible backup copy for this repair; GitHub only recognizes the `.yml` file under `.github/workflows`. If GitHub says Actions are disabled, enable them under **Settings → Actions → General**.

## 3. Install from Windows

1. Follow [AltStore Classic's official Windows setup](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows) to install **AltServer** on the PC and its required Apple software. Use **Classic**, which supports this free personal-signing route.
2. Connect the iPhone to the PC by USB, unlock it, and trust the computer. Use AltServer to install AltStore on your phone, following its prompts for your own Apple account and verification.
3. Trust the developer profile under iPhone **Settings → General → VPN & Device Management**, if prompted. On iOS 16 or newer, enable **Settings → Privacy & Security → Developer Mode** when requested and complete the restart.
4. Transfer **LARYN-unsigned.ipa** to the iPhone's Files app, for example through iCloud Drive. In AltStore Classic, open **My Apps → +** and choose that IPA. Keep AltServer running and reachable on the same network during installation.
5. Open **LARYN AI** from its Home Screen icon.

Enter your Apple credentials only through the official AltServer/AltStore flow on your own devices. They do not belong in this chat, source code, or GitHub workflow.

With a free Apple account, installed apps normally expire after **seven days**. Refresh them through AltStore while AltServer is reachable before they expire. Free accounts also have installation limits, typically three active apps including AltStore. This is personal testing, not an App Store release or a permanent install. Do not uninstall to update if you want to retain locally saved phrases; install the new build using the same account and app identity.

## 4. Check the app on your phone

- Open all five screens and check the notch, Home indicator, and on-screen keyboard.
- In Communication, play English and Thai phrases, change the speed, stop playback, and tap two phrases quickly. Check your iPhone's volume and available voices if speech fails.
- Save a custom phrase, close LARYN, and reopen it. Test another launch in airplane mode. App screens are bundled; additional speech voices may need downloading.
- Import a synthetic sensor CSV from Files. Export it, choose **Save to Files** in the share sheet, and confirm the saved CSV opens. Cancel an export too; it should not display an error.
- Try a local demo alert and acknowledge it. The prototype does not contact caregivers or perform continuous background monitoring.

Actual iPhone speech, sharing, signing, and installation cannot be verified in this Linux workspace. The automated native-adapter checks use mocks; complete these phone checks after the cloud build.

## Developer commands

```sh
npm ci                 # Node 22 or newer; workflow uses Node 24
npm run ios:sync        # Compile and copy bundled screens; wire up native plugins
npm test               # CSV logic, native speech cancellation, and share errors
npm run test:e2e        # Browser interactions and accessibility
npm run test:native     # Native-mode bundle with a mocked iPhone bridge
npm run package:ios     # Prepare the source ZIP (Python 3 and Git required)
```

The Xcode project uses Swift Package Manager. On a Mac, `npm run ios:open` opens it in Xcode. The cloud workflow builds for a physical iPhone with signing disabled and verifies the IPA structure; AltStore handles signing afterward. The app ID is `app.laryn.prototype`, the current minimum iOS version is 15, and no website URL is configured in Capacitor.
