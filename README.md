# Capto

**An open-source screen recorder for macOS that you build, own and host.** Record your screen with your camera and voice. Then send a private, expiring link from **your own** cloud storage. There's no service, account, subscription or tracking.

Capto is written in TypeScript on Electron and distributed as source. It started as a replacement for paid hosted screen-recording tools, for the everyday job of recording a walkthrough and sending it to a client.

[Website & docs](https://capto.ljappsolutions.com) · [Build from source](#build-from-source) · [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · License: [MIT](LICENSE)

---

## Features

- **Record a screen or a single window** with microphone and computer (system) audio. Saves H.264/AAC `.mp4` files that open in QuickTime. No virtual audio driver needed.
- **A camera bubble you can actually place:** drag it anywhere, resize it, choose circle, rounded or square, mirror it and add a border. While recording, change its size or corner, or switch to camera-only.
- **Lives in the menu bar.** Start a recording from the menu or with <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd>, then pause or stop from a small floating bar.
- **Crash-safe.** Video is written to disk every second while you record, and interrupted recordings are recovered on the next launch.
- **Share links from your own storage:**
  - Amazon S3
  - S3-compatible services (Cloudflare R2, Backblaze B2, Wasabi, MinIO…)
  - Azure Blob Storage
  - Google Cloud Storage
- **Expiring, revocable links.** Pre-signed links last up to 7 days (S3, GCS) or 30 days (Azure). Issue a new link without re-uploading, or delete the cloud copy to revoke it.
- **A clean viewer page.** The storage link travels in the URL fragment (`/v#…`), which browsers never send to the server. You can host the viewer yourself, or share direct file links.
- **Private by design.** Recordings stay on your Mac until you choose to share one. Cloud credentials are encrypted with the macOS Keychain and never reach the UI process.

## Build from source

**Requirements:**
- macOS 14 (Sonoma) or later on Apple Silicon. System audio needs 14.2 or later.
- [Node.js 22+](https://nodejs.org).
- [Yarn Classic 1.22](https://classic.yarnpkg.com) (`corepack enable`).
- The Xcode Command Line Tools (`xcode-select --install`).

```bash
git clone https://github.com/ljappsolutions/capto.git
cd capto
yarn install
yarn dev
```

`yarn dev` runs Capto with hot reload. macOS shows it as **Electron**, so grant permissions to "Electron" while developing.

### Package your own Capto.app

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false yarn package:dir
ditto release/mac-arm64/Capto.app /Applications/Capto.app
open /Applications/Capto.app
```

This makes an ad-hoc signed app, and you won't get a Gatekeeper prompt because you built it yourself. Use `yarn package` if you also want a `.dmg`. To sign with your own Apple Developer ID, leave out the environment variable (see [docs/RELEASING.md](docs/RELEASING.md)).

### Permissions

macOS asks for each permission the first time a feature needs it. You can change them later in System Settings → Privacy & Security.

| Permission | Needed for | Notes |
| --- | --- | --- |
| Screen & System Audio Recording | Required | Capto shows up in the list after its first capture attempt. Quit and reopen Capto after granting |
| Microphone | Optional | Your voice |
| Camera | Optional | The camera bubble |

Every ad-hoc rebuild has a new code signature, so macOS may ask for Screen Recording again after an update.

### Updating

```bash
git pull && yarn install
CSC_IDENTITY_AUTO_DISCOVERY=false yarn package:dir
```

Quit Capto (menu bar icon → **Quit Capto**), replace `/Applications/Capto.app` with the new build, and reopen it. Settings and recordings are kept.

### Uninstalling

Quit Capto and delete `/Applications/Capto.app`. To also remove its data:
- Recordings: `~/Movies/Capto/`
- Settings and encrypted credentials: `~/Library/Application Support/Capto/` (`capto/` for dev builds)
- Permissions: System Settings → Privacy & Security
- Login item: System Settings → General → Login Items

## Using it

1. Click the menu bar icon → **New Recording**, or press <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd>.
2. Pick a screen or window, and choose your microphone, camera and computer audio.
3. With the camera on, drag and resize the bubble in the preview.
4. Click **Start Recording**. After a 3-second countdown, use the floating bar to pause, toggle the mic or camera, move the bubble, or stop.
5. The `.mp4` is saved to `~/Movies/Capto/`, and Capto shows options to reveal it in Finder, rename it or share it.

### Sharing with a link

1. Create a private bucket or container, plus credentials limited to it. The [storage guides](https://capto.ljappsolutions.com/docs) include least-privilege policies for every provider.
2. In Capto, open **Settings → Sharing**:
   - Choose the provider.
   - Enter the bucket or container and a folder.
   - Save your credentials, then click **Test connection**.
3. After a recording, choose an expiry and click **Upload & copy link**.

From the recording's page you can copy the link again, issue a **New link** with a different expiry, or **Delete from cloud** to revoke it. Settings can also upload and copy the link automatically when a recording finishes. Capto never makes your bucket public.

## Development

```bash
yarn typecheck && yarn lint && yarn test   # run before every PR
yarn test:storage:up                       # S3Mock, Azurite, fake-gcs-server in Docker
yarn test:storage                          # provider integration tests
yarn test:storage:down
```

You don't need a cloud account to work on uploads and signing: every provider has an integration test that runs against a local emulator.

- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): dev workflow, using the app against emulators, macOS permission quirks in dev, and troubleshooting.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): processes, the recording pipeline, storage providers and the share-link format.
- [docs/RELEASING.md](docs/RELEASING.md): versioning, signing and notarization, and deploying the website.

### Project structure

```
src/main        Electron main process: windows, tray, capture, files, settings, credentials, uploads
src/preload     Typed bridge (window.recorderAPI) between UI and main
src/renderer    React UI: picker, controls, recordings, settings, sharing
src/recorder    Recording engine: MediaRecorder, audio mixing, camera compositing
src/shared      Pure helpers and IPC contracts (unit tested)
website/        Next.js site: project page, docs and the /v share viewer
```

## Privacy

Capto has no backend and collects no analytics. Recordings are only uploaded when you ask, and only to the storage account you configured. The viewer page plays the video straight from your bucket, using a link that stays in the URL fragment. See [SECURITY.md](SECURITY.md) for how credentials are stored.

## Roadmap

Next up:
- Trim before sharing.
- Hardware-accelerated export.
- Captions.
- A floating on-screen camera bubble.

See [docs/ROADMAP.md](docs/ROADMAP.md). Ideas and votes are welcome in [Issues](https://github.com/ljappsolutions/capto/issues).

## Contributing

Contributions are all very welcome:
- Bug reports.
- Fixes.
- Docs.
- Testing against real Azure and Google Cloud accounts.

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately, as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © LJ App Solutions and contributors.

> Name note: another commercial macOS app is also called "Capto". This project may be renamed before a wider launch.
