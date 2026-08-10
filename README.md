# Capto

Local-first macOS screen recorder. Capto lives in the menu bar, captures screens or application windows, mixes microphone + system audio, optionally composites a circular webcam bubble, and saves short MP4 recordings on disk for QuickTime. No cloud, accounts, or uploads.

## Architecture

| Layer | Responsibility |
| --- | --- |
| **Main** (`src/main`) | App lifecycle, tray, windows, permissions, `desktopCapturer`, display-media handler, settings, progressive disk writes, Finder / System Settings |
| **Preload** (`src/preload`) | Tiny typed `window.recorderAPI` via `contextBridge` |
| **Renderer** (`src/renderer`) | React UI: picker, permissions, controls, completion, recordings, settings |
| **Recorder** (`src/recorder`) | `Recorder`, `AudioMixer`, `VideoCompositor`, MediaRecorder orchestration |
| **Shared** (`src/shared`) | IPC contracts, types, constants, pure helpers |

Security baseline: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The renderer never receives `ipcRenderer`.

The **picker window hosts the recording engine**. The floating controls window sends commands over IPC so pause/mic/camera/stop work across BrowserWindows.

## Prerequisites

- macOS 14+
- Apple Silicon (arm64) recommended
- Node.js 22+ (current LTS)
- Yarn Classic 1.22+
- Xcode Command Line Tools (for native Electron rebuilds)

## Install (development)

```bash
yarn install
yarn dev
```

## Install (as Capto.app)

```bash
yarn package:dir   # fast: builds release/mac-arm64/Capto.app
# or
yarn package       # also builds a .dmg in release/
```

Then open `release/mac-arm64/Capto.app` (or drag the DMG app into `/Applications`).

### Why Activity Monitor / permissions say “Electron”

`yarn dev` launches the **Electron** binary from `node_modules`. macOS names that process **Electron**, not Capto. That is expected.

To see **Capto** in Screen Recording, Login Items, and the menu bar as a real app, run a packaged build (`yarn package:dir`).

| Mode | Process name in macOS | Bundle id |
| --- | --- | --- |
| `yarn dev` | Electron | Electron’s id |
| Packaged `.app` | Capto | `app.capto.desktop` |

## Updating

**Dev workflow**

1. Pull / edit code
2. Stop the running app (tray → **Quit Capto**)
3. `yarn install` if dependencies changed
4. `yarn dev`

**Packaged app workflow**

1. Quit Capto completely
2. `yarn package:dir` (or `yarn package`)
3. Replace the old app: drag the new `Capto.app` over the previous copy in `/Applications` (or open the new one from `release/`)
4. Re-grant Screen Recording if macOS treats it as a new binary (common after rebuilds/re-signing)

## Uninstall

1. Quit Capto (tray → **Quit Capto**). If a stuck **Electron** process remains: Activity Monitor → quit **Electron**, or `pkill -f 'Electron.*capto|Capto'`.
2. Delete the app:
   - Dev: nothing in `/Applications` — just stop `yarn dev`
   - Packaged: move `Capto.app` to Trash
3. Optional data cleanup:
   - Settings: `~/Library/Application Support/capto/`
   - Recordings: `~/Movies/Capto/`
   - Login Items: System Settings → General → Login Items → remove Capto/Electron if listed
   - Privacy: System Settings → Privacy & Security → Screen Recording / Mic / Camera → remove Capto or Electron

## Development

```bash
yarn dev          # electron-vite + Electron (shows as Electron)
yarn typecheck
yarn lint
yarn test
yarn build
yarn package:dir  # Capto.app only
yarn package      # Capto.app + dmg
```

On launch, Capto shows **only a menu bar icon** (no large main window). Use:

- Menu: **New Recording**
- Shortcut: **⌘⇧R** (configurable)

## macOS permissions

| Permission | Required? | Notes |
| --- | --- | --- |
| Screen Recording | Yes | Enable the process you launched (**Electron** in dev, **Capto** when packaged). Usually requires quit/reopen after granting. |
| Microphone | Optional | Requested in-app via `askForMediaAccess`. |
| Camera | Optional | Requested in-app. |
| System Audio | With screen | Loopback via Electron display-media on macOS 14+. Packaged apps need `NSAudioCaptureUsageDescription`. |

### Why Capto is missing from the Screen Recording list

macOS does **not** pre-populate that list. An app appears only after it **attempts** screen capture (TCC). Capto does this when you:

1. Open the source picker (enumerates sources), or
2. Click **Open System Settings** for Screen Recording (probes capture, then opens Settings)

Then look for:

- **Electron** if you used `yarn dev`
- **Capto** if you opened `Capto.app`

There is no supported API to insert an app into that list without a capture attempt, and no way for a `yarn dev` session to appear as “Capto” — that requires packaging.

### Packaged vs `yarn dev`

When you launch from a terminal/IDE, permissions attach to **Electron**. Packaged builds use Capto’s bundle id and Info.plist usage strings. Always toggle the entry that matches the process you actually launched.

## System audio caveats

- Target: macOS 14.2+ desktop/loopback capture in Chromium/Electron.
- Packaged builds **must** include `NSAudioCaptureUsageDescription` (configured in `package.json` → `build.mac.extendInfo`).
- A missing usage description can yield an audio track that is silent.
- Capto does **not** use BlackHole, Soundflower, or virtual audio drivers.

### Troubleshooting: “No system audio in recording”

1. Confirm Screen Recording is granted for the process you launched.
2. Confirm **System Audio** is enabled in the picker.
3. Prefer a packaged `.app` build when validating system audio.
4. Verify `NSAudioCaptureUsageDescription` is present in the app Info.plist.
5. Quit Capto fully and reopen after changing Screen Recording permission.
6. Check logs for `SYSTEM_AUDIO_UNAVAILABLE` / muted or ended audio tracks.

## Storage

- Recordings: `~/Movies/Capto/` (via `app.getPath('videos')`) — final files are `.mp4`
- Metadata JSON: `~/Movies/Capto/metadata/`
- Interrupted `.partial.webm` files are moved to `~/Movies/Capto/Recoveries/` on next launch and listed as recovered
- Settings: `~/Library/Application Support/capto/settings.json`

Filename pattern: `YYYY-MM-DD_HH-mm-ss_Source-Name.mp4` (H.264/AAC for QuickTime)

MVP limit: **5 minutes** per recording (auto-stop). Capture is recorded as WebM in memory/chunks, then converted to MP4 when the recording finishes.

## Build a .app

```bash
yarn package
```

Output lands in `release/`. Initial target is **arm64**. Developer ID signing / notarization can be added later; do not commit certificates or Apple credentials.

`LSUIElement` is set so Capto behaves as a menu-bar agent (no Dock icon).

## Current limitations

- Capture uses WebM internally, then transcodes to H.264/AAC MP4 for QuickTime (requires bundled ffmpeg-static)
- One active recording at a time
- Individual windows/screens (no “all windows of an app” grouping)
- Floating controls may appear in recordings if the chosen source includes that display region; Electron does not reliably exclude the controls window from all capture modes
- The picker window hosts the compositor and is parked (opacity 0) rather than hidden during recording so `canvas.captureStream` keeps producing frames
- No cloud upload, sharing, transcription, or editing
- Ad-hoc / local packaging first; notarization not wired
- Launch at login only registers for packaged Capto.app (not `yarn dev`)

## License

MIT
