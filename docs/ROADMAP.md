# Capto Roadmap: Open Source + Shareable Links

Goal: turn Capto into an open-source Loom replacement. You record locally, upload to **your own** cloud storage, and send clients a link that expires. There is no Capto backend, no accounts, and no vendor holding your videos.

---

## Status (2026-11-26)

| Phase | State |
| --- | --- |
| 0. Open-source readiness | ✅ LICENSE, CONTRIBUTING, SECURITY, CoC, issue/PR templates, CI (app, website, storage emulators), release workflow (unsigned), configurable recording limit. ⏳ Name decision, Apple Developer ID signing. |
| 1. Upload + share links (S3, S3-compatible) | ✅ Provider layer, Keychain-encrypted credentials, Settings → Sharing, Test connection, Upload & copy link, renew / delete-from-cloud, share badges, metadata v2, auto-upload. |
| 2. Website + `/v` viewer | ✅ Built in `website/` (builds, lints). ⏳ First `sst deploy` (settings via `website/.env`), DNS CNAME. |
| 3. Camera overlay | ✅ Drag/resize editor, shapes, sizes, mirror, border, camera-only layout, live size/corner/layout controls. ⏳ Floating on-screen bubble window (item 4), background blur. |
| 4. Azure + GCS | ✅ Implemented; integration-tested against Azurite and fake-gcs-server. ⏳ Real-account testing. |
| 5. Extras | ⏳ Not started (trim, VideoToolbox, auto-update, captions…). |

---

## Phase 0: Open-source readiness (do first, ~1–2 days)

| Item | Why |
| --- | --- |
| **Check the name "Capto"** | An existing commercial macOS screen-capture app is already called Capto (Global Delight). Check trademark risk before you put up a site and a GitHub org. Otherwise, pick a new name now, while renaming is cheap (`APP_ID`, `productName`, domain). |
| Add a `LICENSE` file (MIT) | `package.json` says MIT, but the repo has no license file. |
| `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue/PR templates | Standard for contributors. `SECURITY.md` matters because the app will handle cloud credentials. |
| GitHub Actions CI: `lint`, `typecheck`, `test` on PRs | Keeps outside contributions safe to merge. |
| Release workflow: build the arm64 (+ x64) DMG on a tag, attach it to GitHub Releases | The website's Download button points here. |
| **Code signing + notarization** (Apple Developer ID, $99/yr) | Without them, every user hits a Gatekeeper "damaged / unidentified developer" warning and macOS resets Screen Recording permission on each update. Auto-update also requires it. If you postpone it, document the `xattr -dr com.apple.quarantine` workaround. |
| **Remove the 5-minute cap** (`MAX_RECORDING_DURATION_MS`, used in `Recorder.ts`, `useRecorder.ts`, `useRecorderHost.ts`) | A Loom replacement needs longer recordings. Make it a setting (default: unlimited, or 60 min), keep the timer UI, and warn when disk space is low. |
| Remove committed build artifacts (`tsconfig.web.tsbuildinfo`) and add them to `.gitignore` | Housekeeping. |

---

## Phase 1: Cloud upload + expiring share links (AWS first)

### 1.1 Storage provider abstraction (main process)

New folder `src/main/storage/`:

```ts
interface StorageProvider {
  id: 'aws-s3' | 's3-compatible' | 'azure-blob' | 'gcs'
  testConnection(): Promise<TestResult>          // put + sign + get + delete a tiny probe object
  upload(localPath: string, objectKey: string, opts: {
    contentType: string
    onProgress(fraction: number): void
    signal: AbortSignal
  }): Promise<void>
  createSignedUrl(objectKey: string, expiresInSec: number): Promise<string>
  delete(objectKey: string): Promise<void>
  maxExpirySec: number                           // S3/GCS: 7 days; Azure: configurable
}
```

The renderer never talks to the cloud or sees secrets. Everything runs in `main` over new IPC channels (`storage:test`, `storage:upload`, `storage:sign`, `storage:delete`, plus a `storage:progress` event).

### 1.2 AWS S3 implementation

- Packages: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage` (multipart upload with progress, resumable chunks) and `@aws-sdk/s3-request-presigner`.
- Config: access key ID, secret access key, region, bucket, **folder prefix** (e.g. `capto/`), default link expiry.
- Object layout: `{prefix}/{yyyy}/{mm}/{recordingId}/{filename}.mp4` plus `poster.jpg`. The poster is a frame grabbed with the bundled ffmpeg.
- Upload headers: `Content-Type: video/mp4` and `Content-Disposition: inline` so the video plays in the browser. Transcode already uses `+faststart`, so playback starts before the whole file downloads.
- The bucket stays **private** (Block Public Access on). Access is only through presigned `GetObject` URLs.
- **Hard limit to show in the UI:** SigV4 presigned URLs last at most **7 days**, and only when signed with IAM *user* keys. With temporary STS/SSO credentials they die when the session expires. The expiry picker offers 1h / 1d / 3d / 7d and clamps to `maxExpirySec`. A "Regenerate link" action re-signs without re-uploading.
- Docs ship a least-privilege IAM policy: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:AbortMultipartUpload` on `arn:aws:s3:::BUCKET/PREFIX/*` only.

### 1.3 S3-compatible (nearly free to add, recommended)

Same code with a custom `endpoint` + `forcePathStyle`. This covers **Cloudflare R2** (zero egress fees, a big deal for video), Backblaze B2, Wasabi, DigitalOcean Spaces and MinIO. For many people this will be a better default than AWS.

### 1.4 Credential storage

- Secrets are encrypted with Electron `safeStorage` (backed by the macOS Keychain) and written to `~/Library/Application Support/capto/credentials.bin`. They **never** go in `settings.json`.
- Non-secret config (provider, region, bucket, prefix, endpoint, default expiry) goes in `settings.json` through `parseSettings`.
- The renderer only receives `{ configured: true, keyHint: '…AB12' }`. Fields are write-only after save, with a "Replace key" button.
- "Remove credentials" wipes the file.

### 1.5 UI

- **Settings → Sharing tab:** provider dropdown, fields per provider, folder prefix, default expiry, **Test connection** button with a clear error mapping (bad key, wrong region, AccessDenied on prefix, CORS).
- **Complete screen:** a "Upload & copy link" button with a progress bar and cancel. When the upload finishes, the link is on the clipboard and a toast says "Link copied, expires Dec 3".
- **Recordings screen:** a share badge per recording (Not shared / Shared, expires in 2d / Expired), plus actions: Copy link, Regenerate link, Change expiry, Delete from cloud.
- **Optional:** auto-upload after every recording.

### 1.6 Metadata

Bump `METADATA_VERSION` to 2 and add `shares: ShareRecord[]` to `RecordingMetadata`:

```ts
interface ShareRecord {
  provider: StorageProviderId
  location: string        // bucket/container
  objectKey: string
  posterKey?: string
  signedUrl: string
  viewerUrl?: string
  createdAt: string
  expiresAt: string
}
```

Migration: a v1 file parses with `shares: []`.

### 1.7 Revocation

A presigned link can't be revoked by itself. "Delete from cloud" deletes the object, which kills the link right away. Explain this in the UI.

---

## Phase 2: Website (`capto.ljappsolutions.com`): Next.js + SST

Stack: Next.js 16, React 19, styled-components, MDX, SST v4 `sst.aws.Nextjs`, `us-east-1`, `dns: false` (DNS managed outside AWS). The domain and ACM certificate are supplied through environment variables at deploy time.

**Repo layout:** put it in a `website/` folder in this repo with its own `package.json` and `sst.config.ts`. Docs then version with the code, and contributors can fix both in one PR. No workspace refactor of the desktop app is needed.

```ts
new sst.aws.Nextjs("CaptoSite", {
  path: "website",
  domain: { name: process.env.CAPTO_SITE_DOMAIN, dns: false, cert: process.env.CAPTO_SITE_CERT_ARN },
})
```

### Pages

| Route | Content |
| --- | --- |
| `/` | Developer-focused project page: what's inside, how the pipeline works, storage providers, share-link format with a live decoder, how to hack on it, FAQ. No downloads: Capto is distributed as source |
| `/docs/*` (MDX) | Overview, build from source, architecture, sharing and self-hosting the viewer, storage setup guides for **AWS S3**, **Cloudflare R2**, **Azure**, **GCS** (with IAM policy JSON), camera, privacy, troubleshooting, contributing |
| **`/v`** | **Share viewer** (below) |
| `/privacy` | Short: the app collects nothing; the site uses no tracking or only cookieless analytics |
| GitHub / Sponsor links | Open-source standard |

### The share viewer (`/v`): recommended over raw S3 links

A raw presigned URL works, but clients see a bare video tab or a download prompt. Instead, Capto builds:

```
https://capto.ljappsolutions.com/v#<base64url JSON: { video, poster, title, expiresAt }>
```

- Browsers never send the part after `#` to the server. The website (and you) never see video URLs, so it stays fully static and private.
- The page renders a clean player with title, expiry notice, playback speed and a download button. The `<video>` element plays straight from the user's own bucket.
- Fallback: a setting to copy the raw signed URL instead.
- Trade-offs: links are long, and Slack/iMessage won't show a preview card, because no server can read the fragment. Short links with previews would need a backend that stores link mappings. Skip that for now. Forks can set their own "viewer base URL" in settings.

---

## Phase 3: Better camera overlay

Today: a fixed circle at 22% of the short side, 4 corners, no live preview (`VideoCompositor.drawCameraBubble`).

### Data model

Replace `CameraPosition` with:

```ts
interface CameraOverlay {
  shape: 'circle' | 'rounded' | 'square'
  size: number           // 0.10–0.45 of the short side
  x: number; y: number   // normalized center 0–1
  mirror: boolean
  border: 'none' | 'subtle' | 'accent'
}
```

`parseSettings` maps the old corner values to x/y, so existing users keep their setup.

### Features (priority order)

1. **Live placement preview** in the picker: the camera bubble sits over the source thumbnail. You drag it to move it and drag a handle to resize it. Corners snap with a margin.
2. **Shape + size + mirror + border** controls in the picker and settings.
3. **Change during recording:** quick size toggle (S/M/L) and corner snapping from the controls window, sent to `compositor.setOverlay()` over IPC (this path already exists for camera on/off).
4. **Floating camera bubble on screen** (Loom-style), for full-screen recordings: a transparent, always-on-top, draggable window shows the camera, and its position maps 1:1 to the composited overlay. It uses `setContentProtection(true)` so it isn't captured twice. *Verify on macOS 14/15 with ScreenCaptureKit.*
5. **Layouts:** "Camera only" (full-frame webcam, for quick talking-head messages) and "Screen only".
6. *Later:* background blur with MediaPipe selfie segmentation, run in the compositor at 30 fps.

Compositor changes: shape-aware clip paths (`roundRect`), mirror with `ctx.scale(-1, 1)`, and position from normalized coordinates. All of this is pure math, so the geometry helpers in `src/shared/cameraOverlay.ts` can get unit tests.

---

## Phase 4: Azure Blob + Google Cloud Storage

Both implement the same `StorageProvider` interface. **You don't need accounts to test them:** both have local emulators that can run in CI.

| | Azure Blob | Google Cloud Storage |
| --- | --- | --- |
| Package | `@azure/storage-blob` | `@google-cloud/storage` |
| Credentials | Storage account name + account key (needed to sign SAS), or a connection string | Service-account JSON key (stored encrypted) |
| Location | Container + folder prefix | Bucket + folder prefix |
| Upload | `BlockBlobClient.uploadFile` (parallel blocks, `onProgress`) | Resumable upload (`createWriteStream({ resumable: true })`) |
| Link | Read-only blob **SAS** (`generateBlobSASQueryParameters`); no hard expiry cap, so the UI caps it at 30 days | **V4 signed URL**, max **7 days** |
| Local emulator for tests | **Azurite** (Docker) | **fake-gcs-server** (Docker) |

Plan: integration tests per provider, run in GitHub Actions against MinIO (S3), Azurite and fake-gcs-server, marked "community-tested" in the docs until someone confirms against a real account. Open GitHub issues asking for testers.

---

## Phase 5: Further recommendations (ranked by value for a Loom replacement)

1. **Trim before sharing:** set start/end handles on the Complete screen and cut with the ffmpeg you already bundle (`-ss/-to`, stream copy when possible). Loom users use this all the time.
2. **Faster export:** try `h264_videotoolbox` (Apple hardware encoder) and fall back to `libx264`. Exporting long recordings would get several times faster.
3. **Auto-update:** `electron-updater` with GitHub Releases (requires signing, Phase 0).
4. **Local captions / transcript:** whisper.cpp runs on the device; upload `.vtt` next to the video, and the viewer shows captions. This keeps the privacy story.
5. **Microphone quality:** expose `noiseSuppression` / `echoCancellation` toggles and a live level meter in the picker.
6. **Cursor highlight + click ripples**, and a "spotlight" while recording.
7. **Drawing / annotation** during recording.
8. **GIF / short clip export** for bug reports.
9. **Bucket lifecycle helper:** a docs snippet (or button) that adds an S3 lifecycle rule to auto-delete shared videos after N days, to control storage costs.
10. **Windows / Linux builds:** Electron makes this feasible later. System-audio capture is the hard part.

Avoid for now: Capto-hosted storage, user accounts, view analytics. Each of these needs a backend and goes against the local-first promise. View counts could come later as an *opt-in* self-hosted Lambda.

---

## Suggested order and effort

| # | Work | Rough effort | Can run in parallel with |
| --- | --- | --- | --- |
| 0 | Open-source readiness, remove cap, CI | 1–2 days | — |
| 1 | Storage abstraction + AWS/S3-compatible + credentials + Sharing UI + metadata v2 | 4–6 days | 2, 3 |
| 2 | Website + `/v` viewer + docs, SST deploy | 3–4 days | 1, 3 |
| 3 | Camera overlay (items 1–3, then 4–5) | 3–5 days | 1, 2 |
| 4 | Azure + GCS + emulator tests | 2–3 days | after 1 |
| 5 | Trim, VideoToolbox, auto-update… | ongoing | — |

Phases 1, 2 and 3 touch separate areas (main/storage, `website/`, recorder/compositor), so each can be its own branch and PR at the same time. The only contract between 1 and 2 is the `/v#…` payload format; define it first in `src/shared/shareLink.ts`.

## Open decisions for you

1. Keep the name **Capto**, or rename before going public?
2. Share links: **viewer page (`/v#…`)** as the default, or raw signed URLs?
3. Website in **this repo (`website/`)** or a separate repo?
4. Buy an Apple Developer ID for signing/notarization now, or ship unsigned at first?
5. Default recording limit once the 5-minute cap is gone (unlimited vs. configurable)?
