import { desktopCapturer, shell, systemPreferences } from 'electron'
import type { PermissionState, PermissionStatus } from '@shared/types'
import { log } from './logger'

function mapStatus(status: string): PermissionStatus {
  switch (status) {
    case 'granted':
      return 'granted'
    case 'denied':
      return 'denied'
    case 'restricted':
      return 'restricted'
    case 'not-determined':
      return 'not-determined'
    default:
      return 'unknown'
  }
}

export function getPermissions(): PermissionState {
  const screen = mapStatus(systemPreferences.getMediaAccessStatus('screen'))
  const microphone = mapStatus(systemPreferences.getMediaAccessStatus('microphone'))
  const camera = mapStatus(systemPreferences.getMediaAccessStatus('camera'))

  const state: PermissionState = {
    screen,
    microphone,
    camera,
    // System audio cannot be queried the same way; treat as granted when screen is granted.
    systemAudio: screen === 'granted' ? 'granted' : 'not-determined',
    screenRequiresRestart: screen === 'granted' ? false : false
  }

  log.info('Permissions checked', { ...state })
  return state
}

export async function requestMicrophoneAccess(): Promise<boolean> {
  try {
    const granted = await systemPreferences.askForMediaAccess('microphone')
    log.info('Microphone access requested', { granted })
    return granted
  } catch (error) {
    log.error('Microphone access request failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

export async function requestCameraAccess(): Promise<boolean> {
  try {
    const granted = await systemPreferences.askForMediaAccess('camera')
    log.info('Camera access requested', { granted })
    return granted
  } catch (error) {
    log.error('Camera access request failed', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

/**
 * macOS only adds a process to Screen Recording after it attempts capture.
 * Probe desktopCapturer first so Electron/Capto appears in the list, then open Settings.
 */
export async function ensureScreenRecordingPrompted(): Promise<void> {
  try {
    await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 },
      fetchWindowIcons: false
    })
    log.info('Screen capture probe completed (TCC registration)')
  } catch (error) {
    log.warn('Screen capture probe failed (expected before permission grant)', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export async function openScreenRecordingSettings(): Promise<void> {
  await ensureScreenRecordingPrompted()
  await shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
  )
}

export async function openMicrophoneSettings(): Promise<void> {
  await shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
  )
}

export async function openCameraSettings(): Promise<void> {
  await shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'
  )
}
