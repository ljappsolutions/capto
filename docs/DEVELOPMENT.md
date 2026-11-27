# Development guide

## Prerequisites

- macOS 14+ (Apple Silicon recommended)
- Node.js 22+
- Yarn Classic 1.22+ (`corepack enable` or `npm i -g yarn`)
- Xcode Command Line Tools: `xcode-select --install`
- Optional: Docker, for the storage emulators

## Everyday commands

```bash
yarn install        # install dependencies
yarn dev            # run the app with hot reload (renderer); restart for main-process changes
yarn typecheck      # TypeScript, main + renderer
yarn lint           # ESLint
yarn test           # Vitest unit tests
yarn build          # production bundle in out/
yarn package:dir    # release/mac-arm64/Capto.app
yarn package        # .app + .dmg in release/
```

Capto runs as a menu bar app with no Dock icon. After `yarn dev`, use the menu bar icon or <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd>.

Only one Capto can run per settings folder. If an installed Capto is already running, quit it first, or the dev build exits with "Another Capto instance is running".

## Dev build vs packaged app

`yarn dev` runs the **Electron** binary from `node_modules`, so macOS shows it as **Electron** in Activity Monitor and in every Privacy & Security list. Grant Screen Recording, Microphone and Camera to **Electron** while developing.

| Mode | Name in macOS | Bundle id | Settings folder |
| --- | --- | --- | --- |
| `yarn dev` | Electron | Electron's | `~/Library/Application Support/capto` |
| Packaged `.app` | Capto | `app.capto.desktop` | `~/Library/Application Support/Capto` |

Launch at login only works in the packaged app.

### Camera prompt never appears in dev

macOS checks camera permission against the *responsible* process: whichever app launched Electron. That might be Terminal, iTerm, VS Code or an AI coding tool. If that app isn't allowed to request the camera, macOS denies access without showing a prompt. Fixes:

- Run `yarn dev` from Terminal.app, which can show the prompt, or
- Build and open the app through Launch Services, which makes Electron responsible for itself:

  ```bash
  yarn build
  open -n node_modules/electron/dist/Electron.app --args "$PWD"
  ```

### Screen Recording

macOS only adds an app to the Screen Recording list after it first tries to capture. Opening the source picker triggers that attempt. After you grant access, quit and reopen the app.

## Testing cloud storage without accounts

Every provider has an integration test that runs against a local emulator in Docker (`docker-compose.storage.yml`):

```bash
yarn test:storage:up     # S3Mock :9090, Azurite :10000, fake-gcs-server :4443
yarn test:storage        # CAPTO_STORAGE_IT=1 vitest run src/main/storage
yarn test:storage:down
```

To click through the app against the emulators, configure **Settings → Sharing** as follows:

| Provider in Capto | Settings |
| --- | --- |
| S3-compatible → S3Mock | Endpoint `http://localhost:9090`, region `us-east-1`, **Force path-style** on, any key and secret. Create the bucket first: `curl -X PUT http://localhost:9090/capto-test` |
| Azure Blob → Azurite | Account `devstoreaccount1`, endpoint `http://127.0.0.1:10000/devstoreaccount1`, the well-known Azurite key from Microsoft's docs. The container is created on first upload |
| Google Cloud Storage → fake-gcs-server | API endpoint `http://localhost:4443`, any syntactically valid service-account JSON. Create the bucket: `curl -X POST -H 'Content-Type: application/json' -d '{"name":"capto-test"}' http://localhost:4443/storage/v1/b` |

To try the full viewer flow locally, run the website (`cd website && yarn dev`). Then set **Settings → Sharing → Advanced → Viewer base URL** to `http://localhost:3000`.

Emulators don't behave exactly like the real services, especially when validating signed URLs. Results from real Azure and Google Cloud accounts are very welcome as GitHub issues.

## Writing code

- **Keep the renderer sandboxed.** No Node APIs in `src/renderer` or `src/recorder`. Add an IPC channel in `src/shared/ipc.ts`, a handler in `src/main/ipc.ts` that validates its input, and a method in `src/preload/index.ts`.
- **Keep secrets in the main process.** Never log credentials, and never send them to the renderer. `describeStorageError` strips URLs from error messages before they reach the UI.
- **Put pure logic in `src/shared` with a unit test** next to it (`*.test.ts`).
- **Keep the share-link contract in sync.** If you change `src/shared/shareLink.ts`, update `website/lib/shareLink.ts` too.
- **Change settings carefully.** If you add or change a setting, update `parseSettings` (and the migration, if the shape changes) so old `settings.json` files still load.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Source list is empty | Screen Recording isn't granted to the process you launched. Grant it, then quit and reopen |
| Recording is black | You picked a window that is minimized, on another Space, or content-protected |
| No system audio | Requires macOS 14.2+. Make sure **Include computer audio** is checked; packaged builds need `NSAudioCaptureUsageDescription` (already in `package.json`) |
| Camera denied without a prompt | See "Camera prompt never appears in dev" above |
| "Another Capto instance is running" | Quit the other copy from the menu bar icon, or `pkill -x Capto` |
| Upload fails with a signature or CORS error | Check the bucket region, the system clock, and that the viewer origin is allowed by your bucket's CORS rules (see the website docs) |

The main process logs to stdout. To see them for the packaged app, run `/Applications/Capto.app/Contents/MacOS/Capto` from a terminal.
