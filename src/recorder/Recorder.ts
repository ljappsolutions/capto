import {
  AUDIO_BITRATE,
  COUNTDOWN_SECONDS,
  MAX_RECORDING_DURATION_MS,
  MEDIA_RECORDER_TIMESLICE_MS,
  MIME_CANDIDATES,
  TARGET_FPS,
  VIDEO_BITRATE
} from '@shared/constants'
import { getOutputLimits } from '@shared/videoQuality'
import type { AppError, RecordingMetadata, RecordingOptions, RecordingState } from '@shared/types'
import { AudioMixer } from './AudioMixer'
import { getCameraStream, getMicrophoneStream, stopStream } from './MediaDevices'
import type { RecorderEventMap, RecorderListener } from './types'
import { VideoCompositor } from './VideoCompositor'

function pickMimeType(): string {
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }
  throw Object.assign(new Error('No supported MediaRecorder MIME type'), {
    code: 'MIME_UNSUPPORTED'
  })
}

function makeId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export class Recorder {
  private state: RecordingState = 'idle'
  private options: RecordingOptions | null = null
  private recordingId: string | null = null
  private mimeType: string | null = null
  private desktopStream: MediaStream | null = null
  private cameraStream: MediaStream | null = null
  private micStream: MediaStream | null = null
  private mixedAudio: MediaStream | null = null
  private composedVideo: MediaStream | null = null
  private recordStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private mixer = new AudioMixer()
  private compositor = new VideoCompositor()
  private sequence = 0
  private startedAt = 0
  private accumulatedMs = 0
  private tickTimer: number | null = null
  private countdownTimer: number | null = null
  private autoStopTimer: number | null = null
  private microphoneEnabled = true
  private cameraEnabled = false
  private systemAudioEnabled = true
  private listeners: { [K in keyof RecorderEventMap]: Set<RecorderListener<K>> } = {
    state: new Set(),
    progress: new Set(),
    error: new Set(),
    completed: new Set()
  }
  private width = 0
  private height = 0
  private videoBitrate = VIDEO_BITRATE
  private ffmpegCrf = 22

  on<K extends keyof RecorderEventMap>(event: K, listener: RecorderListener<K>): () => void {
    this.listeners[event].add(listener)
    return () => {
      this.listeners[event].delete(listener)
    }
  }

  private emit<K extends keyof RecorderEventMap>(event: K, payload: RecorderEventMap[K]): void {
    for (const listener of this.listeners[event]) {
      listener(payload)
    }
  }

  getState(): RecordingState {
    return this.state
  }

  private setState(state: RecordingState): void {
    this.state = state
    this.emit('state', state)
  }

  private fail(error: AppError): void {
    this.setState('error')
    this.emit('error', error)
  }

  async prepare(options: RecordingOptions): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'completed' && this.state !== 'error') {
      throw new Error(`Cannot prepare from state ${this.state}`)
    }

    await this.disposeInternal(false)
    this.setState('preparing')
    this.options = options
    this.microphoneEnabled = options.microphoneEnabled
    this.cameraEnabled = options.cameraEnabled
    this.systemAudioEnabled = options.systemAudioEnabled
    this.recordingId = makeId()
    this.sequence = 0
    this.accumulatedMs = 0

    try {
      await window.recorderAPI.setSelectedCaptureSource(
        options.captureSourceId,
        options.systemAudioEnabled
      )

      this.mimeType = pickMimeType()

      this.desktopStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: options.systemAudioEnabled
      })

      const videoTrack = this.desktopStream.getVideoTracks()[0]
      if (!videoTrack) {
        throw this.appError('DISPLAY_STREAM_FAILED', 'Could not start the display capture stream.')
      }

      videoTrack.addEventListener('ended', () => {
        if (this.state === 'recording' || this.state === 'paused') {
          void this.stop().catch(() => undefined)
        } else if (this.state === 'preparing' || this.state === 'ready' || this.state === 'countdown') {
          this.fail(
            this.appError(
              'SOURCE_DISAPPEARED',
              'The selected window or screen is no longer available.'
            )
          )
          void this.disposeInternal(true)
        }
      })

      if (options.microphoneEnabled) {
        try {
          this.micStream = await getMicrophoneStream(options.microphoneDeviceId)
        } catch {
          this.fail(
            this.appError(
              'MICROPHONE_PERMISSION_DENIED',
              'Microphone access was denied. You can continue without a microphone.'
            )
          )
          // Non-fatal: continue without mic
          this.microphoneEnabled = false
          this.micStream = null
        }
      }

      if (options.cameraEnabled) {
        try {
          this.cameraStream = await getCameraStream(options.cameraDeviceId)
        } catch {
          this.cameraEnabled = false
          this.cameraStream = null
        }
      }

      const systemAudioStream =
        options.systemAudioEnabled && this.desktopStream.getAudioTracks().length > 0
          ? new MediaStream(this.desktopStream.getAudioTracks())
          : null

      if (options.systemAudioEnabled && !systemAudioStream) {
        // Continue, but surface a soft error for diagnostics.
        this.emit('error', {
          code: 'SYSTEM_AUDIO_UNAVAILABLE',
          message:
            'System audio track was not provided. Check Screen Recording permission and NSAudioCaptureUsageDescription in packaged builds.'
        })
      }

      this.mixedAudio = await this.mixer.prepare({
        systemStream: systemAudioStream,
        micStream: this.micStream,
        systemVolume: options.systemVolume,
        micVolume: options.micVolume
      })

      const limits = getOutputLimits(options.videoQuality)

      this.composedVideo = await this.compositor.prepare({
        desktopStream: this.desktopStream,
        cameraStream: this.cameraStream,
        cameraEnabled: this.cameraEnabled,
        cameraPosition: options.cameraPosition,
        maxWidth: limits.width,
        maxHeight: limits.height
      })

      const size = this.compositor.getSize()
      this.width = size.width
      this.height = size.height
      this.videoBitrate = limits.videoBitrate
      this.ffmpegCrf = limits.ffmpegCrf

      this.recordStream = new MediaStream()
      for (const track of this.composedVideo.getVideoTracks()) {
        this.recordStream.addTrack(track)
      }
      if (this.mixedAudio) {
        for (const track of this.mixedAudio.getAudioTracks()) {
          this.recordStream.addTrack(track)
        }
      }

      await window.recorderAPI.createRecordingFile({
        id: this.recordingId,
        captureSourceName: options.captureSourceName,
        captureSourceType: options.captureSourceType,
        mimeType: this.mimeType,
        microphoneEnabled: this.microphoneEnabled,
        cameraEnabled: this.cameraEnabled,
        systemAudioEnabled: options.systemAudioEnabled,
        width: this.width,
        height: this.height,
        fps: TARGET_FPS,
        videoBitrate: this.videoBitrate,
        ffmpegCrf: this.ffmpegCrf
      })

      this.setState('ready')
    } catch (error) {
      const appErr =
        error && typeof error === 'object' && 'code' in error
          ? (error as AppError)
          : this.appError(
              'DISPLAY_STREAM_FAILED',
              error instanceof Error ? error.message : 'Failed to prepare recording.'
            )
      this.fail(appErr)
      await this.disposeInternal(true)
      throw appErr
    }
  }

  async start(): Promise<void> {
    if (this.state !== 'ready') {
      throw new Error(`Cannot start from state ${this.state}`)
    }
    if (!this.recordStream || !this.mimeType || !this.recordingId) {
      throw new Error('Recorder is not prepared')
    }

    this.setState('countdown')
    await window.recorderAPI.showWindow('countdown')

    await new Promise<void>((resolve) => {
      let remaining = COUNTDOWN_SECONDS
      this.countdownTimer = window.setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          if (this.countdownTimer !== null) {
            clearInterval(this.countdownTimer)
            this.countdownTimer = null
          }
          resolve()
        }
      }, 1000)
    })

    await window.recorderAPI.hideWindow('countdown')
    // Park (do not hide) the picker: it hosts the canvas compositor. Hiding the
    // BrowserWindow freezes captureStream to the last painted frame (often "1").
    await window.recorderAPI.parkRecordingHost()
    await window.recorderAPI.showWindow('controls')

    // Let the compositor paint a couple of post-countdown frames first.
    this.compositor.paintNow()
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, Math.round(1000 / TARGET_FPS) * 2)
    })
    this.compositor.paintNow()

    this.mediaRecorder = new MediaRecorder(this.recordStream, {
      mimeType: this.mimeType,
      videoBitsPerSecond: this.videoBitrate,
      audioBitsPerSecond: AUDIO_BITRATE
    })

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (!event.data.size || !this.recordingId) return
      const seq = this.sequence
      this.sequence += 1
      void event.data.arrayBuffer().then((buffer) =>
        window.recorderAPI.appendRecordingChunk({
          id: this.recordingId!,
          chunk: buffer,
          sequence: seq
        })
      )
    }

    this.mediaRecorder.onerror = () => {
      this.fail(this.appError('MEDIA_RECORDER_FAILED', 'MediaRecorder reported an error.'))
    }

    this.mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS)
    this.startedAt = Date.now()
    this.setState('recording')
    this.startTick()
    this.autoStopTimer = window.setTimeout(() => {
      void this.stop().catch(() => undefined)
    }, MAX_RECORDING_DURATION_MS)
  }

  pause(): void {
    if (this.state !== 'recording' || !this.mediaRecorder) return
    this.mediaRecorder.pause()
    this.accumulatedMs += Date.now() - this.startedAt
    this.setState('paused')
  }

  resume(): void {
    if (this.state !== 'paused' || !this.mediaRecorder) return
    this.mediaRecorder.resume()
    this.startedAt = Date.now()
    this.setState('recording')
  }

  async stop(): Promise<RecordingMetadata> {
    if (
      this.state !== 'recording' &&
      this.state !== 'paused' &&
      this.state !== 'countdown' &&
      this.state !== 'ready'
    ) {
      throw new Error(`Cannot stop from state ${this.state}`)
    }

    const previousState = this.state
    this.setState('stopping')
    this.clearTimers()

    if (previousState === 'countdown' || previousState === 'ready' || !this.mediaRecorder) {
      await this.disposeInternal(true)
      await window.recorderAPI.hideWindow('countdown')
      this.setState('idle')
      throw this.appError('UNKNOWN', 'Recording was cancelled before it started.')
    }

    const elapsed = this.getElapsedMs()

    const stopped = new Promise<void>((resolve) => {
      if (!this.mediaRecorder) {
        resolve()
        return
      }
      this.mediaRecorder.onstop = () => resolve()
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      } else {
        resolve()
      }
    })

    await stopped

    // Allow final dataavailable handlers to flush
    await new Promise((r) => setTimeout(r, 100))

    await window.recorderAPI.hideWindow('controls')
    await window.recorderAPI.hideWindow('countdown')
    await window.recorderAPI.showWindow('exporting')

    try {
      const metadata = await window.recorderAPI.finalizeRecording({
        id: this.recordingId!,
        durationMs: elapsed
      })

      await this.disposeInternal(false)
      this.setState('completed')
      this.emit('completed', { metadata })
      await window.recorderAPI.notifyRecordingStopped(metadata.id)
      return metadata
    } catch (error) {
      await window.recorderAPI.hideWindow('exporting')
      await window.recorderAPI.unparkRecordingHost()
      await window.recorderAPI.showWindow('picker')
      const message =
        error instanceof Error ? error.message : 'Failed to export the recording.'
      this.fail(this.appError('UNKNOWN', message))
      throw error
    }
  }

  setMicrophoneEnabled(enabled: boolean): void {
    this.microphoneEnabled = enabled
    this.mixer.setMicrophoneEnabled(enabled)
  }

  setCameraEnabled(enabled: boolean): void {
    this.cameraEnabled = enabled
    this.compositor.setCameraEnabled(enabled)
  }

  setSystemAudioEnabled(enabled: boolean): void {
    this.systemAudioEnabled = enabled
    this.mixer.setSystemVolume(enabled ? (this.options?.systemVolume ?? 1) : 0)
  }

  setMicVolume(volume: number): void {
    this.mixer.setMicVolume(volume)
  }

  setSystemVolume(volume: number): void {
    this.mixer.setSystemVolume(this.systemAudioEnabled ? volume : 0)
  }

  isMicrophoneEnabled(): boolean {
    return this.microphoneEnabled
  }

  isCameraEnabled(): boolean {
    return this.cameraEnabled
  }

  getElapsedMs(): number {
    if (this.state === 'recording') {
      return this.accumulatedMs + (Date.now() - this.startedAt)
    }
    if (this.state === 'paused') {
      return this.accumulatedMs
    }
    return this.accumulatedMs
  }

  async dispose(): Promise<void> {
    await this.disposeInternal(true)
    this.setState('idle')
  }

  private startTick(): void {
    this.clearTick()
    this.tickTimer = window.setInterval(() => {
      const elapsedMs = this.getElapsedMs()
      const remainingMs = Math.max(0, MAX_RECORDING_DURATION_MS - elapsedMs)
      this.emit('progress', { elapsedMs, remainingMs })
      if (remainingMs <= 0 && this.state === 'recording') {
        void this.stop().catch(() => undefined)
      }
    }, 250)
  }

  private clearTick(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  private clearTimers(): void {
    this.clearTick()
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    if (this.autoStopTimer !== null) {
      clearTimeout(this.autoStopTimer)
      this.autoStopTimer = null
    }
  }

  private appError(code: AppError['code'], message: string): AppError {
    return { code, message }
  }

  private async disposeInternal(discardFile: boolean): Promise<void> {
    this.clearTimers()

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop()
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null

    await this.compositor.dispose()
    await this.mixer.dispose()

    stopStream(this.desktopStream)
    stopStream(this.cameraStream)
    // micStream stopped by mixer.dispose
    this.desktopStream = null
    this.cameraStream = null
    this.micStream = null
    this.mixedAudio = null
    this.composedVideo = null
    this.recordStream = null

    if (discardFile && this.recordingId) {
      try {
        await window.recorderAPI.discardRecording(this.recordingId)
      } catch {
        // ignore
      }
    }

    this.recordingId = null
    this.options = null
    this.mimeType = null
  }
}

let singleton: Recorder | null = null

export function getRecorder(): Recorder {
  if (!singleton) {
    singleton = new Recorder()
  }
  return singleton
}
