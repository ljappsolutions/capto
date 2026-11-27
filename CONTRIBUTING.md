# Contributing to Capto

Thanks for helping! Capto is a local-first macOS screen recorder. Contributions of all sizes are welcome.

## Setup

```bash
yarn install
yarn dev
```

Requirements: macOS 14+, Node.js 22+, Yarn Classic 1.22+, Xcode Command Line Tools.

## Before opening a PR

```bash
yarn lint
yarn typecheck
yarn test
```

CI runs the same checks on every pull request.

## Project layout

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the app fits together and [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the dev workflow, macOS permission quirks in dev, and troubleshooting. In short: `src/main` (Electron main process, including `src/main/storage` cloud providers), `src/preload` (typed bridge), `src/renderer` (React UI), `src/recorder` (capture/compositing), `src/shared` (pure, unit-tested helpers and IPC contracts), `website/` (Next.js site + share viewer).

## Testing cloud storage providers without accounts

Each provider can be exercised against a local emulator:

| Provider | Emulator | Command |
| --- | --- | --- |
| S3 / S3-compatible | Adobe S3Mock | `docker run -p 9090:9090 adobe/s3mock:3.12.0` |
| Azure Blob | Azurite | `docker run -p 10000:10000 mcr.microsoft.com/azure-storage/azurite azurite-blob --blobHost 0.0.0.0` |
| Google Cloud Storage | fake-gcs-server | `docker run -p 4443:4443 fsouza/fake-gcs-server -scheme http -public-host localhost:4443` |

Or start all three with `yarn test:storage:up`, run the provider integration tests with `yarn test:storage`, and stop them with `yarn test:storage:down`.

Then in **Settings → Sharing**:

- **S3Mock:** provider "S3-compatible", endpoint `http://localhost:9090`, region `us-east-1`, path-style on, any access key / secret. Create a bucket first: `curl -X PUT http://localhost:9090/my-bucket`.
- **Azurite:** account `devstoreaccount1`, endpoint `http://127.0.0.1:10000/devstoreaccount1`, the well-known Azurite development key (see Microsoft's Azurite docs), any container name (created on first upload).
- **fake-gcs-server:** API endpoint `http://localhost:4443`, any bucket name, and a syntactically valid service-account JSON (signing uses the key locally).

Real-account testing of Azure and Google Cloud is especially welcome; please report results in the matching GitHub issue.

## Guidelines

- Keep the renderer sandboxed: no Node APIs in `src/renderer`, everything goes through `window.recorderAPI`.
- Secrets never leave the main process and are never logged.
- Put pure logic in `src/shared` with a unit test.
- Keep PRs focused; describe what you tested (including macOS version).
- Add a line under "Unreleased" in [CHANGELOG.md](CHANGELOG.md) for user-visible changes.

## Good first contributions

- Test Azure Blob Storage or Google Cloud Storage sharing with a real account and report back.
- Improve the setup guides in `website/app/(site)/docs/`.
- Pick an issue labeled `good first issue`.
