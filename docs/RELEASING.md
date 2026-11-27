# Releasing

Capto is distributed as source, so a release is mainly a tagged, changelogged version people can build. When you push a `v*` tag, GitHub Actions (`.github/workflows/release.yml`) runs the tests, builds an arm64 DMG as a build check, and creates a GitHub Release with generated notes. The website doesn't link to release binaries.

## Steps

1. Make sure `main` is green in CI.
2. Update `CHANGELOG.md`: move the "Unreleased" items under a new version heading.
3. Bump the version:

   ```bash
   npm version 0.3.0 --no-git-tag-version   # updates package.json
   git commit -am "Release v0.3.0"
   git tag v0.3.0
   git push origin main --tags
   ```

4. Wait for the **Release** workflow, then check the release page. Download the DMG, install it, and smoke-test:
   - A recording with the camera and microphone on.
   - An upload and share link.
   - The viewer page.

## Building locally

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false yarn package
```

Outputs `release/Capto-<version>-arm64.dmg` and `release/mac-arm64/Capto.app`. Without that variable, electron-builder signs with any Apple certificate it finds in your keychain.

## Code signing and notarization (not yet enabled)

Builds are currently unsigned, so users have to clear the quarantine flag. To ship signed and notarized builds:

1. Get an Apple **Developer ID Application** certificate, export it as a `.p12`, and base64-encode it.
2. Add these repository secrets:
   - `CSC_LINK`: the base64 `.p12`
   - `CSC_KEY_PASSWORD`
   - `APPLE_ID`
   - `APPLE_APP_SPECIFIC_PASSWORD`
   - `APPLE_TEAM_ID`
3. In `release.yml`, remove `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` and pass the Apple secrets as env vars. Set `"notarize": true` under `build.mac` in `package.json`.

Signed builds run under the hardened runtime, which needs the entitlements in `resources/entitlements.mac.plist`:
- JIT for V8.
- Camera.
- Microphone (`device.audio-input`).

Don't remove the camera or microphone entries: without them, macOS silently denies camera and microphone access in signed builds.

Never commit certificates, passwords or Apple credentials.

## Website

The website deploys separately from `website/` with SST:

```bash
cd website
cp .env.example .env   # set AWS_PROFILE, CAPTO_SITE_DOMAIN, CAPTO_SITE_CERT_ARN
yarn deploy            # production stage
```

Account-specific values (the AWS profile, the domain and the ACM certificate ARN) only ever live in `website/.env` or your shell, never in the repo. After the first deploy, point the domain's DNS (a CNAME) at the CloudFront distribution that SST outputs.
