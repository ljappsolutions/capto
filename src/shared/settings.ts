import { DEFAULT_CAMERA_OVERLAY, parseCameraOverlay } from './cameraOverlay'
import { DEFAULT_GLOBAL_SHORTCUT, DEFAULT_MAX_RECORDING_MINUTES, MAX_RECORDING_MINUTES_LIMIT } from './constants'
import { DEFAULT_SHARING, parseSharingSettings } from './sharing'
import type { AppSettings } from './types'
import { isVideoQuality } from './videoQuality'

export const DEFAULT_SETTINGS: AppSettings = {
  launchAtLogin: true,
  defaultMicrophoneId: null,
  defaultCameraId: null,
  defaultCameraEnabled: false,
  defaultSystemAudioEnabled: true,
  recordingDirectory: null,
  globalShortcut: DEFAULT_GLOBAL_SHORTCUT,
  cameraOverlay: { ...DEFAULT_CAMERA_OVERLAY },
  cameraLayout: 'overlay',
  videoQuality: '1080p',
  systemVolume: 1,
  micVolume: 1,
  maxRecordingMinutes: DEFAULT_MAX_RECORDING_MINUTES,
  sharing: structuredClone(DEFAULT_SHARING)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseSettings(raw: unknown): AppSettings {
  if (!isObject(raw)) {
    return structuredClone(DEFAULT_SETTINGS)
  }

  return {
    launchAtLogin:
      typeof raw.launchAtLogin === 'boolean' ? raw.launchAtLogin : DEFAULT_SETTINGS.launchAtLogin,
    defaultMicrophoneId:
      typeof raw.defaultMicrophoneId === 'string' || raw.defaultMicrophoneId === null
        ? raw.defaultMicrophoneId
        : DEFAULT_SETTINGS.defaultMicrophoneId,
    defaultCameraId:
      typeof raw.defaultCameraId === 'string' || raw.defaultCameraId === null
        ? raw.defaultCameraId
        : DEFAULT_SETTINGS.defaultCameraId,
    defaultCameraEnabled:
      typeof raw.defaultCameraEnabled === 'boolean'
        ? raw.defaultCameraEnabled
        : DEFAULT_SETTINGS.defaultCameraEnabled,
    defaultSystemAudioEnabled:
      typeof raw.defaultSystemAudioEnabled === 'boolean'
        ? raw.defaultSystemAudioEnabled
        : DEFAULT_SETTINGS.defaultSystemAudioEnabled,
    recordingDirectory:
      typeof raw.recordingDirectory === 'string' || raw.recordingDirectory === null
        ? raw.recordingDirectory
        : DEFAULT_SETTINGS.recordingDirectory,
    globalShortcut:
      typeof raw.globalShortcut === 'string' && raw.globalShortcut.length > 0
        ? raw.globalShortcut
        : DEFAULT_SETTINGS.globalShortcut,
    // `cameraPosition` is the pre-0.2 corner setting; migrate it once.
    cameraOverlay: parseCameraOverlay(raw.cameraOverlay, raw.cameraPosition),
    cameraLayout: raw.cameraLayout === 'camera-only' ? 'camera-only' : 'overlay',
    videoQuality: isVideoQuality(raw.videoQuality)
      ? raw.videoQuality
      : DEFAULT_SETTINGS.videoQuality,
    systemVolume:
      typeof raw.systemVolume === 'number' && Number.isFinite(raw.systemVolume)
        ? Math.min(2, Math.max(0, raw.systemVolume))
        : DEFAULT_SETTINGS.systemVolume,
    micVolume:
      typeof raw.micVolume === 'number' && Number.isFinite(raw.micVolume)
        ? Math.min(2, Math.max(0, raw.micVolume))
        : DEFAULT_SETTINGS.micVolume,
    maxRecordingMinutes:
      typeof raw.maxRecordingMinutes === 'number' && Number.isFinite(raw.maxRecordingMinutes)
        ? Math.min(MAX_RECORDING_MINUTES_LIMIT, Math.max(0, Math.round(raw.maxRecordingMinutes)))
        : DEFAULT_SETTINGS.maxRecordingMinutes,
    sharing: parseSharingSettings(raw.sharing)
  }
}
