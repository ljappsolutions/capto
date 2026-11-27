# Changelog

All notable changes to Capto are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-11-26

First open-source release.

### Added
- Share recordings with expiring links from your own storage: Amazon S3, S3-compatible services (R2, B2, Wasabi, MinIO), Azure Blob Storage and Google Cloud Storage.
- **Settings → Sharing**, where you can:
  - Choose a provider, bucket and folder.
  - Store credentials encrypted with the macOS Keychain.
  - Test the connection.
  - Set a default expiry, choose the link type and turn on auto-upload.
- Upload with progress, **Upload & copy link**, a new link without re-uploading, and **Delete from cloud** to revoke. Shared badges in the recordings list.
- Viewer page on the website (`/v#…`) that plays the video straight from your bucket. The link stays in the URL fragment.
- New camera bubble editor:
  - Drag and resize.
  - Circle, rounded or square, with border and mirror.
  - Corner presets and a camera-only layout.
- Live camera controls while recording: size, move to a corner, camera-only.
- Configurable recording limit, which defaults to no limit.
- Website with docs at capto.ljappsolutions.com.
- Open-source project files: license, contributing guide, security policy, CI, and release workflow.

### Changed
- The camera settings replace the old fixed camera position. Existing settings migrate automatically.
- Removed the fixed 5-minute recording limit.

### Fixed
- Recording duration was saved as 0.
- Exported MP4s were padded to 1000 fps with duplicated frames.
- The microphone selector showed "Off" while the default microphone was actually recording.
- Capto's own windows were offered as capture sources and recorded as black.
- Settings controls briefly snapped back after a change.

## [0.1.0]

- Initial private version: menu bar screen recorder with microphone, system audio, camera bubble and MP4 export.
