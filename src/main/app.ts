import { app, BrowserWindow, dialog, protocol } from 'electron'
import { setSystemAudioPreference } from './capture'
import { markAppQuitting } from './lifecycle'
import { log } from './logger'
import { registerIpcHandlers, registerMediaProtocol } from './ipc'
import {
  abortActiveRecordingOnShutdown,
  hasActiveRecording,
  recoverPartialRecordings
} from './recordings'
import { applyLoginItemSettings, loadSettings } from './settings'
import { registerGlobalShortcut, unregisterGlobalShortcuts } from './shortcuts'
import { createTray, destroyTray } from './tray'
import { closeAllWindows } from './windows'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'capto-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
])

let initialized = false

export async function startApp(): Promise<void> {
  if (initialized) return
  initialized = true

  const gotLock = app.requestSingleInstanceLock()
  if (!gotLock) {
    log.warn('Another Capto instance is running; quitting')
    app.quit()
    return
  }

  app.on('second-instance', () => {
    log.info('Second instance launched; focusing tray workflow')
  })

  app.setName('Capto')

  await app.whenReady()

  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }

  protocolRegister()
  registerIpcHandlers()

  const settings = loadSettings()
  applyLoginItemSettings(settings.launchAtLogin)
  setSystemAudioPreference(settings.defaultSystemAudioEnabled)

  createTray()
  registerGlobalShortcut(settings.globalShortcut)

  await recoverPartialRecordings()

  const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin
  log.info('App started', {
    openedAtLogin,
    platform: process.platform,
    electron: process.versions.electron
  })

  app.on('activate', () => {
    // Menu-bar app: do not open a window on dock activate.
  })

  app.on('before-quit', (event) => {
    if (hasActiveRecording()) {
      event.preventDefault()
      void (async () => {
        const result = await dialog.showMessageBox({
          type: 'warning',
          buttons: ['Stop and Quit', 'Cancel'],
          defaultId: 0,
          cancelId: 1,
          message: 'A recording is in progress',
          detail: 'Quitting will stop the recording and keep a recoverable partial file.'
        })
        if (result.response === 0) {
          await abortActiveRecordingOnShutdown()
          markAppQuitting()
          app.exit(0)
        }
      })()
      return
    }

    markAppQuitting()
  })

  app.on('will-quit', () => {
    markAppQuitting()
    unregisterGlobalShortcuts()
    destroyTray()
    closeAllWindows()
  })

  app.on('window-all-closed', () => {
    // Keep running as a tray app on macOS.
  })
}

function protocolRegister(): void {
  if (!app.isReady()) return
  try {
    registerMediaProtocol()
  } catch (error) {
    log.warn('Media protocol registration failed', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export function getAllWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows()
}
