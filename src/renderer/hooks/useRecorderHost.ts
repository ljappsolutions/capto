import { useEffect } from 'react'
import { getRecorder } from '@recorder/Recorder'
import { MAX_RECORDING_DURATION_MS } from '@shared/constants'
import type { RecorderCommand } from '@shared/ipc'

/**
 * Runs in the picker window (recording host). Bridges Recorder events/commands
 * to the floating controls window via main-process IPC.
 */
export function useRecorderHost(): void {
  useEffect(() => {
    const recorder = getRecorder()

    const publishProgress = (): void => {
      void window.recorderAPI.publishRecorderEvent({
        type: 'progress',
        state: recorder.getState(),
        elapsedMs: recorder.getElapsedMs(),
        remainingMs: Math.max(0, MAX_RECORDING_DURATION_MS - recorder.getElapsedMs()),
        microphoneEnabled: recorder.isMicrophoneEnabled(),
        cameraEnabled: recorder.isCameraEnabled()
      })
    }

    const offState = recorder.on('state', (state) => {
      void window.recorderAPI.publishRecorderEvent({ type: 'state', state })
      publishProgress()
    })
    const offProgress = recorder.on('progress', () => {
      publishProgress()
    })
    const offError = recorder.on('error', (error) => {
      void window.recorderAPI.publishRecorderEvent({
        type: 'error',
        message: error.message
      })
    })

    const offCommand = window.recorderAPI.onRecorderCommand((command: RecorderCommand) => {
      switch (command.type) {
        case 'pause':
          recorder.pause()
          break
        case 'resume':
          recorder.resume()
          break
        case 'stop':
          void recorder.stop().catch(() => undefined)
          break
        case 'toggle-mic':
          recorder.setMicrophoneEnabled(!recorder.isMicrophoneEnabled())
          publishProgress()
          break
        case 'toggle-camera':
          recorder.setCameraEnabled(!recorder.isCameraEnabled())
          publishProgress()
          break
      }
    })

    return () => {
      offState()
      offProgress()
      offError()
      offCommand()
    }
  }, [])
}
