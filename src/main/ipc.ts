import { app, ipcMain, protocol, net } from 'electron'
import { pathToFileURL } from 'node:url'
import { IpcChannels, type RecorderBridgeEvent, type RecorderCommand } from '@shared/ipc'
import type { AppSettings, WindowKind } from '@shared/types'
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
