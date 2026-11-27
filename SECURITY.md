# Security Policy

Capto handles cloud storage credentials (AWS, S3-compatible, Azure, Google Cloud). We take reports seriously.

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's private vulnerability reporting ("Security" tab → "Report a vulnerability"). We aim to respond within 7 days.

## How Capto handles secrets

- Credentials are encrypted with Electron `safeStorage` (backed by the macOS Keychain) and stored in `~/Library/Application Support/Capto/credentials.bin`.
- They are only read in the Electron main process; the sandboxed renderer only sees whether a credential exists and a short hint.
- Credentials are sent only to the storage provider you configured. Capto has no backend and no telemetry.
- Share links are pre-signed URLs with an expiry. Anyone holding a link can view the video until it expires; delete the object from the app to revoke access early.

## Recommendations for users

- Use a dedicated IAM user / service account with access limited to one bucket and prefix (see the website docs for policies).
- Keep buckets private (Block Public Access on).
