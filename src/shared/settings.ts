import { DEFAULT_GLOBAL_SHORTCUT } from './constants'
import type { AppSettings } from './types'

export const DEFAULT_SETTINGS: AppSettings = {
  launchAtLogin: true,
  defaultMicrophoneId: null,
  defaultCameraId: null,
  defaultCameraEnabled: false,
  defaultSystemAudioEnabled: true,
  recordingDirectory: null,
  globalShortcut: DEFAULT_GLOBAL_SHORTCUT,
  cameraPosition: 'bottom-right',
  videoQuality: '1080p',
  systemVolume: 1,
  micVolume: 1
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseSettings(raw: unknown): AppSettings {
  if (!isObject(raw)) {
    return { ...DEFAULT_SETTINGS }
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
    cameraPosition:
      raw.cameraPosition === 'top-left' ||
      raw.cameraPosition === 'top-right' ||
      raw.cameraPosition === 'bottom-left' ||
      raw.cameraPosition === 'bottom-right'
        ? raw.cameraPosition
        : DEFAULT_SETTINGS.cameraPosition,
    videoQuality:
      raw.videoQuality === '720p' || raw.videoQuality === '1080p'
        ? raw.videoQuality
        : DEFAULT_SETTINGS.videoQuality,
    systemVolume:
      typeof raw.systemVolume === 'number' && Number.isFinite(raw.systemVolume)
        ? Math.min(2, Math.max(0, raw.systemVolume))
        : DEFAULT_SETTINGS.systemVolume,
    micVolume:
      typeof raw.micVolume === 'number' && Number.isFinite(raw.micVolume)
        ? Math.min(2, Math.max(0, raw.micVolume))
        : DEFAULT_SETTINGS.micVolume
  }
}
