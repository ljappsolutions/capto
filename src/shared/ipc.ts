import type {
  AppSettings,
  AppSettingsView,
  AppendChunkPayload,
  CaptureSource,
  CreateRecordingPayload,
  FinalizeRecordingPayload,
  PermissionState,
  RecordingListItem,
  RecordingMetadata,
  RenameRecordingPayload,
  WindowKind
} from './types'

export const IpcChannels = {
  getCaptureSources: 'capto:get-capture-sources',
  setSelectedCaptureSource: 'capto:set-selected-capture-source',
  getPermissions: 'capto:get-permissions',
  requestMicrophoneAccess: 'capto:request-microphone-access',
  requestCameraAccess: 'capto:request-camera-access',
  openScreenRecordingSettings: 'capto:open-screen-recording-settings',
  openMicrophoneSettings: 'capto:open-microphone-settings',
  openCameraSettings: 'capto:open-camera-settings',
  getSettings: 'capto:get-settings',
  updateSettings: 'capto:update-settings',
  createRecordingFile: 'capto:create-recording-file',
  appendRecordingChunk: 'capto:append-recording-chunk',
  finalizeRecording: 'capto:finalize-recording',
  discardRecording: 'capto:discard-recording',
  revealRecording: 'capto:reveal-recording',
  deleteRecording: 'capto:delete-recording',
  renameRecording: 'capto:rename-recording',
  listRecordings: 'capto:list-recordings',
  getRecordingFileUrl: 'capto:get-recording-file-url',
  showWindow: 'capto:show-window',
  hideWindow: 'capto:hide-window',
  parkRecordingHost: 'capto:park-recording-host',
  unparkRecordingHost: 'capto:unpark-recording-host',
  quitApp: 'capto:quit-app',
  getAppPath: 'capto:get-app-path',
  notifyRecordingStopped: 'capto:notify-recording-stopped',
  getPartialRecoveries: 'capto:get-partial-recoveries',
  recorderCommand: 'capto:recorder-command',
  recorderEvent: 'capto:recorder-event'
} as const

export type RecorderCommand =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'toggle-mic' }
  | { type: 'toggle-camera' }

export type RecorderBridgeEvent =
  | {
      type: 'progress'
      state: import('./types').RecordingState
      elapsedMs: number
      remainingMs: number
      microphoneEnabled: boolean
      cameraEnabled: boolean
    }
  | { type: 'state'; state: import('./types').RecordingState }
  | { type: 'error'; message: string }

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

export interface RecorderAPI {
  getCaptureSources: () => Promise<CaptureSource[]>
  setSelectedCaptureSource: (
    sourceId: string | null,
    systemAudioEnabled?: boolean
  ) => Promise<void>
  getPermissions: () => Promise<PermissionState>
  requestMicrophoneAccess: () => Promise<boolean>
  requestCameraAccess: () => Promise<boolean>
  openScreenRecordingSettings: () => Promise<void>
  openMicrophoneSettings: () => Promise<void>
  openCameraSettings: () => Promise<void>
  getSettings: () => Promise<AppSettingsView>
  updateSettings: (partial: Partial<AppSettings>) => Promise<AppSettingsView>
  createRecordingFile: (payload: CreateRecordingPayload) => Promise<{ path: string }>
  appendRecordingChunk: (payload: AppendChunkPayload) => Promise<void>
  finalizeRecording: (payload: FinalizeRecordingPayload) => Promise<RecordingMetadata>
  discardRecording: (id: string) => Promise<void>
  revealRecording: (id: string) => Promise<void>
  deleteRecording: (id: string) => Promise<void>
  renameRecording: (payload: RenameRecordingPayload) => Promise<RecordingMetadata>
  listRecordings: () => Promise<RecordingListItem[]>
  getRecordingFileUrl: (id: string) => Promise<string>
  showWindow: (kind: WindowKind, query?: Record<string, string>) => Promise<void>
  hideWindow: (kind: WindowKind) => Promise<void>
  /**
   * Keep the picker/recording-host window alive but invisible.
   * Must not use hide() — that stops requestAnimationFrame / canvas capture.
   */
  parkRecordingHost: () => Promise<void>
  unparkRecordingHost: () => Promise<void>
  quitApp: () => Promise<void>
  getAppPath: () => Promise<string>
  notifyRecordingStopped: (recordingId: string) => Promise<void>
  getPartialRecoveries: () => Promise<RecordingListItem[]>
  sendRecorderCommand: (command: RecorderCommand) => Promise<void>
  onRecorderCommand: (listener: (command: RecorderCommand) => void) => () => void
  onRecorderEvent: (listener: (event: RecorderBridgeEvent) => void) => () => void
  publishRecorderEvent: (event: RecorderBridgeEvent) => Promise<void>
}
