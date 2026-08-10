import { contextBridge, ipcRenderer } from 'electron'
import {
  IpcChannels,
  type ExportProgressEvent,
  type RecorderAPI,
  type RecorderBridgeEvent,
  type RecorderCommand
} from '../shared/ipc'

const api: RecorderAPI = {
  getCaptureSources: () => ipcRenderer.invoke(IpcChannels.getCaptureSources),
  setSelectedCaptureSource: (sourceId, systemAudioEnabled) =>
    ipcRenderer.invoke(IpcChannels.setSelectedCaptureSource, sourceId, systemAudioEnabled),
  getPermissions: () => ipcRenderer.invoke(IpcChannels.getPermissions),
  requestMicrophoneAccess: () => ipcRenderer.invoke(IpcChannels.requestMicrophoneAccess),
  requestCameraAccess: () => ipcRenderer.invoke(IpcChannels.requestCameraAccess),
  openScreenRecordingSettings: () =>
    ipcRenderer.invoke(IpcChannels.openScreenRecordingSettings),
  openMicrophoneSettings: () => ipcRenderer.invoke(IpcChannels.openMicrophoneSettings),
  openCameraSettings: () => ipcRenderer.invoke(IpcChannels.openCameraSettings),
  getSettings: () => ipcRenderer.invoke(IpcChannels.getSettings),
  updateSettings: (partial) => ipcRenderer.invoke(IpcChannels.updateSettings, partial),
  createRecordingFile: (payload) =>
    ipcRenderer.invoke(IpcChannels.createRecordingFile, payload),
  appendRecordingChunk: (payload) =>
    ipcRenderer.invoke(IpcChannels.appendRecordingChunk, payload),
  finalizeRecording: (payload) => ipcRenderer.invoke(IpcChannels.finalizeRecording, payload),
  discardRecording: (id) => ipcRenderer.invoke(IpcChannels.discardRecording, id),
  revealRecording: (id) => ipcRenderer.invoke(IpcChannels.revealRecording, id),
  deleteRecording: (id) => ipcRenderer.invoke(IpcChannels.deleteRecording, id),
  renameRecording: (payload) => ipcRenderer.invoke(IpcChannels.renameRecording, payload),
  listRecordings: () => ipcRenderer.invoke(IpcChannels.listRecordings),
  getRecordingFileUrl: (id) => ipcRenderer.invoke(IpcChannels.getRecordingFileUrl, id),
  showWindow: (kind, query) => ipcRenderer.invoke(IpcChannels.showWindow, kind, query),
  hideWindow: (kind) => ipcRenderer.invoke(IpcChannels.hideWindow, kind),
  parkRecordingHost: () => ipcRenderer.invoke(IpcChannels.parkRecordingHost),
  unparkRecordingHost: () => ipcRenderer.invoke(IpcChannels.unparkRecordingHost),
  quitApp: () => ipcRenderer.invoke(IpcChannels.quitApp),
  getAppPath: () => ipcRenderer.invoke(IpcChannels.getAppPath),
  notifyRecordingStopped: (recordingId) =>
    ipcRenderer.invoke(IpcChannels.notifyRecordingStopped, recordingId),
  getPartialRecoveries: () => ipcRenderer.invoke(IpcChannels.getPartialRecoveries),
  sendRecorderCommand: (command: RecorderCommand) =>
    ipcRenderer.invoke(IpcChannels.recorderCommand, command),
  onRecorderCommand: (listener: (command: RecorderCommand) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, command: RecorderCommand): void => {
      listener(command)
    }
    ipcRenderer.on(IpcChannels.recorderCommand, handler)
    return () => {
      ipcRenderer.removeListener(IpcChannels.recorderCommand, handler)
    }
  },
  onRecorderEvent: (listener: (event: RecorderBridgeEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: RecorderBridgeEvent): void => {
      listener(payload)
    }
    ipcRenderer.on(IpcChannels.recorderEvent, handler)
    return () => {
      ipcRenderer.removeListener(IpcChannels.recorderEvent, handler)
    }
  },
  publishRecorderEvent: (event: RecorderBridgeEvent) =>
    ipcRenderer.invoke(IpcChannels.recorderEvent, event),
  onExportProgress: (listener: (event: ExportProgressEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: ExportProgressEvent): void => {
      listener(payload)
    }
    ipcRenderer.on(IpcChannels.exportProgress, handler)
    return () => {
      ipcRenderer.removeListener(IpcChannels.exportProgress, handler)
    }
  }
}

contextBridge.exposeInMainWorld('recorderAPI', api)
