# Architecture

Capto is an Electron app: React and TypeScript for the UI, and Node.js in the main process. The website in `website/` is a separate Next.js project.

## Processes and layers

| Layer | Path | Responsibility |
| --- | --- | --- |
| Main process | `src/main` | App lifecycle, tray, windows, permissions, capture-source enumeration, recording files, settings, encrypted credentials, uploads and share links |
| Preload | `src/preload` | Exposes a small typed `window.recorderAPI` through `contextBridge`; nothing else from Node reaches the UI |
| Renderer | `src/renderer` | React screens: picker, controls bar, countdown, exporting, complete, recordings, settings |
| Recorder | `src/recorder` | Recording engine that runs inside the picker window: `Recorder`, `AudioMixer`, `VideoCompositor`, `MediaDevices` |
| Shared | `src/shared` | Pure, unit-tested code: IPC contracts, types, settings parsing, camera geometry, sharing config, share-link format |

Security baseline for every window: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The renderer never receives `ipcRenderer`. All IPC channels are named `capto:*` and defined in `src/shared/ipc.ts`, and the main process validates every argument.

## Main process modules

| File | What it does |
| --- | --- |
| `index.ts`, `app.ts`, `lifecycle.ts` | Startup, single-instance lock, quitting, launch at login |
| `tray.ts`, `shortcuts.ts` | Menu bar icon and the global shortcut |
| `windows.ts` | Creates and positions every window. Parks the recording host during a recording (see below) |
| `capture.ts` | Lists screens and windows with `desktopCapturer`, leaving out Capto's own windows, and answers `getDisplayMedia` with the selected source and loopback audio |
| `permissions.ts` | Screen, microphone, camera and system-audio permission status and prompts |
| `recordings.ts` | Writes chunks to `.partial.webm` as they arrive, finalizes, lists, renames and deletes recordings and their metadata JSON, and recovers interrupted recordings on launch |
| `transcode.ts` | Converts WebM to MP4 (H.264/AAC) with the bundled `ffmpeg-static`, and extracts poster frames |
| `settings.ts` | Loads and saves `settings.json` through the parser in `src/shared/settings.ts`, migrating older formats |
| `credentials.ts` | Cloud credentials encrypted with `safeStorage` (Keychain) in `credentials.bin`, mode 0600 |
| `sharing.ts` | Upload with progress, sign links, record shares in metadata, copy links to the clipboard, test connection, revoke |
| `storage/` | One `StorageProvider` implementation per provider (`s3.ts`, `azure.ts`, `gcs.ts`) behind a common interface (`types.ts`, `index.ts`) |

## How a recording works

1. **Picker.** The picker window lists sources and devices, and hosts the camera-bubble editor (`CameraOverlayEditor.tsx`).
2. **Prepare.** `Recorder` opens the selected source through `getDisplayMedia`, which the main process answers with the selected source. It also opens the microphone and camera through `getUserMedia`.
3. **Composite.** `VideoCompositor` draws the screen and the camera bubble onto a canvas at 30 fps, applying shape, border, shadow, mirroring and layout. `AudioMixer` mixes the microphone and system audio with Web Audio.
4. **Record.** `MediaRecorder` encodes `canvas.captureStream()` and the mixed audio to WebM. It sends a chunk every second over IPC, and the main process appends it to disk. A crash therefore loses at most about a second.
5. **Control.** The floating controls window sends commands (pause, stop, toggle mic or camera, move or resize the bubble, camera-only) over IPC to the picker, which forwards them to `Recorder`.
6. **Finish.** On stop, the main process converts the WebM to MP4 with ffmpeg, writes metadata, and opens the complete window.

**Why the picker is "parked" and not hidden.** Hidden BrowserWindows stop producing `canvas.captureStream` frames. During a recording the picker is made fully transparent, ignores the mouse and is content-protected, but it stays shown. As a result, Capto's own windows record as black, which is why the source list leaves them out.

## Sharing

```
Capto (main process) ──upload──► your bucket ◄──GET (pre-signed)── viewer page in client's browser
        │                                                           ▲
        └── copies https://capto.ljappsolutions.com/v#<payload> ────┘
```

- Objects are stored at `{folder}/{yyyy}/{mm}/{recordingId}/{file}` (see `buildObjectKey` in `src/shared/sharing.ts`), next to an optional `poster.jpg`.
- Links are pre-signed GET URLs: SigV4 for S3, SAS for Azure, V4 signed URLs for GCS. Expiry is limited per provider (`MAX_EXPIRY_SEC`).
- The viewer link carries a base64url JSON payload `{v, u, p?, t?, e?, d?}` in the URL fragment, defined in `src/shared/shareLink.ts`. Browsers never send the fragment to the server, so the website never sees the storage URL. `website/lib/shareLink.ts` is a verbatim copy, so change the two together.
- Share history is stored in the recording's metadata JSON (`shares`), which drives the badges and the "expires in" labels.

## Files on disk

| What | Where |
| --- | --- |
| Recordings | `~/Movies/Capto/*.mp4` (configurable in Settings) |
| Recording metadata | `~/Movies/Capto/metadata/<id>.json` |
| Interrupted recordings | `~/Movies/Capto/Recoveries/` |
| Settings | `~/Library/Application Support/Capto/settings.json` |
| Encrypted credentials | `~/Library/Application Support/Capto/credentials.bin` |

## Website

`website/` is a Next.js 16 app deployed with SST to AWS (`sst.aws.Nextjs`). It is aimed at developers. It contains the project page, `/docs` (building from source, architecture, sharing, storage guides), `/privacy`, and `/v`, the client-side share viewer. Deployment settings (AWS profile, domain, certificate) come from environment variables; see `website/README.md`. See `website/README.md`.
