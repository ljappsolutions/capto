import { app, BrowserWindow, ipcMain, protocol, net, shell } from 'electron'
import { pathToFileURL } from 'node:url'
import { IpcChannels, type RecorderBridgeEvent, type RecorderCommand } from '@shared/ipc'
import { DEFAULT_VIEWER_BASE_URL } from '@shared/shareLink'
import { STORAGE_PROVIDERS } from '@shared/sharing'
import type {
  AppSettings,
  ShareRequest,
  StorageProviderId,
  UploadProgressEvent,
  WindowKind
} from '@shared/types'
import { allCredentialStatuses, clearCredentials, saveCredentials } from './credentials'
import {
  cancelShare,
  copyShareLink,
  deleteRemoteCopies,
  regenerateShareLink,
  shareRecording,
  testStorageConnection
} from './sharing'
import {
  getCaptureSources,
  installDisplayMediaHandler,
  setSelectedCaptureSource,
  setSystemAudioPreference
} from './capture'
import { markAppQuitting } from './lifecycle'
import { log } from './logger'
import {
  openCameraSettings,
  openMicrophoneSettings,
  openScreenRecordingSettings,
  getPermissions,
  requestCameraAccess,
  requestMicrophoneAccess
} from './permissions'
import {
  appendRecordingChunk,
  createRecordingFile,
  deleteRecording,
  discardRecording,
  finalizeRecording,
  getPartialRecoveries,
  getRecordingAbsolutePath,
  getRecordingFileUrl,
  listRecordings,
  renameRecording,
  revealRecording,
  setExportProgressListener
} from './recordings'
import {
  getLaunchAtLoginEffective,
  loadSettings,
  resolveRecordingDirectory,
  updateSettings
} from './settings'
import { registerGlobalShortcut } from './shortcuts'
import {
  broadcastToWindow,
  closeWindow,
  getWindow,
  hideWindow,
  parkRecordingHost,
  showCompleteWindow,
  showExportingWindowReady,
  showWindow,
  unparkRecordingHost
} from './windows'

let registered = false

export function registerIpcHandlers(): void {
  if (registered) return
  registered = true

  installDisplayMediaHandler()

  setExportProgressListener((event) => {
    broadcastToWindow('exporting', IpcChannels.exportProgress, event)
  })

  ipcMain.handle(IpcChannels.getCaptureSources, async () => getCaptureSources())

  ipcMain.handle(
    IpcChannels.setSelectedCaptureSource,
    async (_e, sourceId: string | null, systemAudioEnabled?: boolean) => {
      setSelectedCaptureSource(sourceId)
      if (typeof systemAudioEnabled === 'boolean') {
        setSystemAudioPreference(systemAudioEnabled)
      }
    }
  )

  ipcMain.handle(IpcChannels.getPermissions, async () => getPermissions())

  ipcMain.handle(IpcChannels.requestMicrophoneAccess, async () => requestMicrophoneAccess())

  ipcMain.handle(IpcChannels.requestCameraAccess, async () => requestCameraAccess())

  ipcMain.handle(IpcChannels.openScreenRecordingSettings, async () => {
    await openScreenRecordingSettings()
  })

  ipcMain.handle(IpcChannels.openMicrophoneSettings, async () => {
    await openMicrophoneSettings()
  })

  ipcMain.handle(IpcChannels.openCameraSettings, async () => {
    await openCameraSettings()
  })

  ipcMain.handle(IpcChannels.getSettings, async () => {
    const settings = loadSettings()
    return {
      ...settings,
      launchAtLogin: getLaunchAtLoginEffective(),
      recordingDirectory: resolveRecordingDirectory(settings),
      isPackaged: app.isPackaged
    }
  })

  ipcMain.handle(
    IpcChannels.updateSettings,
    async (_e, partial: Partial<AppSettings>) => {
      const next = updateSettings(partial)
      if (partial.globalShortcut) {
        registerGlobalShortcut(next.globalShortcut)
      }
      if (typeof partial.defaultSystemAudioEnabled === 'boolean') {
        setSystemAudioPreference(partial.defaultSystemAudioEnabled)
      }
      return {
        ...next,
        launchAtLogin: getLaunchAtLoginEffective(),
        recordingDirectory: resolveRecordingDirectory(next),
        isPackaged: app.isPackaged
      }
    }
  )

  ipcMain.handle(IpcChannels.createRecordingFile, async (_e, payload) =>
    createRecordingFile(payload)
  )

  ipcMain.handle(IpcChannels.appendRecordingChunk, async (_e, payload) =>
    appendRecordingChunk(payload)
  )

  ipcMain.handle(IpcChannels.finalizeRecording, async (_e, payload) =>
    finalizeRecording(payload)
  )

  ipcMain.handle(IpcChannels.discardRecording, async (_e, id: string) => discardRecording(id))

  ipcMain.handle(IpcChannels.revealRecording, async (_e, id: string) => revealRecording(id))

  ipcMain.handle(IpcChannels.deleteRecording, async (_e, id: string) => deleteRecording(id))

  ipcMain.handle(IpcChannels.renameRecording, async (_e, payload) => renameRecording(payload))

  ipcMain.handle(IpcChannels.listRecordings, async () => listRecordings())

  ipcMain.handle(IpcChannels.getRecordingFileUrl, async (_e, id: string) =>
    getRecordingFileUrl(id)
  )

  ipcMain.handle(
    IpcChannels.showWindow,
    async (_e, kind: WindowKind, query?: Record<string, string>) => {
      if (kind === 'exporting') {
        await showExportingWindowReady()
        return
      }
      showWindow(kind, query)
    }
  )

  ipcMain.handle(IpcChannels.hideWindow, async (_e, kind: WindowKind) => {
    hideWindow(kind)
  })

  ipcMain.handle(IpcChannels.parkRecordingHost, async () => {
    parkRecordingHost()
  })

  ipcMain.handle(IpcChannels.unparkRecordingHost, async () => {
    unparkRecordingHost()
  })

  ipcMain.handle(IpcChannels.quitApp, async () => {
    markAppQuitting()
    app.quit()
  })

  ipcMain.handle(IpcChannels.getAppPath, async () => app.getAppPath())

  ipcMain.handle(IpcChannels.notifyRecordingStopped, async (_e, recordingId: string) => {
    closeWindow('controls')
    closeWindow('countdown')
    closeWindow('exporting')
    hideWindow('picker')
    showCompleteWindow(recordingId)
  })

  ipcMain.handle(IpcChannels.getPartialRecoveries, async () => getPartialRecoveries())

  ipcMain.handle(IpcChannels.recorderCommand, async (_e, command: RecorderCommand) => {
    // Commands are handled by the picker window, which owns the Recorder instance.
    const picker = getWindow('picker')
    if (picker) {
      picker.webContents.send(IpcChannels.recorderCommand, command)
    } else {
      log.warn('Recorder command ignored; picker window missing', { command })
    }
  })

  ipcMain.handle(IpcChannels.recorderEvent, async (_e, event: RecorderBridgeEvent) => {
    broadcastToWindow('controls', IpcChannels.recorderEvent, event)
  })

  const broadcastUpload = (event: UploadProgressEvent): void => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send(IpcChannels.uploadProgress, event)
    }
  }

  const assertRecordingId = (id: unknown): string => {
    if (typeof id !== 'string' || !/^[\w.-]{1,128}$/.test(id)) {
      throw new Error('Invalid recording id')
    }
    return id
  }

  const assertProvider = (p: unknown): StorageProviderId => {
    if (!STORAGE_PROVIDERS.includes(p as StorageProviderId)) throw new Error('Unknown provider')
    return p as StorageProviderId
  }

  ipcMain.handle(IpcChannels.getCredentialStatuses, async () => allCredentialStatuses())

  ipcMain.handle(IpcChannels.saveCredentials, async (_e, credentials: unknown) =>
    saveCredentials(credentials)
  )

  ipcMain.handle(IpcChannels.clearCredentials, async (_e, provider: unknown) =>
    clearCredentials(assertProvider(provider))
  )

  ipcMain.handle(IpcChannels.testStorage, async () => testStorageConnection())

  ipcMain.handle(IpcChannels.shareRecording, async (_e, request: ShareRequest) =>
    shareRecording(
      {
        recordingId: assertRecordingId(request?.recordingId),
        expiresInSec:
          typeof request?.expiresInSec === 'number' ? request.expiresInSec : undefined
      },
      broadcastUpload
    )
  )

  ipcMain.handle(IpcChannels.cancelShare, async (_e, id: unknown) => {
    cancelShare(assertRecordingId(id))
  })

  ipcMain.handle(IpcChannels.regenerateShareLink, async (_e, id: unknown, expiresInSec: unknown) =>
    regenerateShareLink(
      assertRecordingId(id),
      typeof expiresInSec === 'number' ? expiresInSec : undefined
    )
  )

  ipcMain.handle(IpcChannels.copyShareLink, async (_e, id: unknown) =>
    copyShareLink(assertRecordingId(id))
  )

  ipcMain.handle(IpcChannels.deleteRemoteCopies, async (_e, id: unknown) =>
    deleteRemoteCopies(assertRecordingId(id))
  )

  ipcMain.handle(IpcChannels.openDocs, async (_e, slug: unknown) => {
    const safe = typeof slug === 'string' && /^[a-z0-9/-]{0,80}$/.test(slug) ? slug : ''
    await shell.openExternal(`${DEFAULT_VIEWER_BASE_URL}/docs${safe ? `/${safe}` : ''}`)
  })

  log.info('IPC handlers registered')
}

export function registerMediaProtocol(): void {
  protocol.handle('capto-media', async (request) => {
    try {
      const url = new URL(request.url)
      const id = url.pathname.replace(/^\//, '').replace(/^recording\//, '')
      const filePath = getRecordingAbsolutePath(id)
      if (!filePath) {
        return new Response('Not found', { status: 404 })
      }
      return net.fetch(pathToFileURL(filePath).toString())
    } catch (error) {
      log.error('Media protocol error', {
        error: error instanceof Error ? error.message : String(error)
      })
      return new Response('Error', { status: 500 })
    }
  })
}
