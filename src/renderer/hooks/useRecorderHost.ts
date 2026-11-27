import { useEffect } from 'react'
import { getRecorder } from '@recorder/Recorder'
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
        remainingMs: recorder.getRemainingMs(),
        microphoneEnabled: recorder.isMicrophoneEnabled(),
        cameraEnabled: recorder.isCameraEnabled(),
        cameraOverlay: recorder.getCameraOverlay() ?? undefined,
        cameraLayout: recorder.getCameraLayout()
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
        case 'set-camera-overlay':
          recorder.setCameraOverlay(command.overlay)
          publishProgress()
          break
        case 'set-camera-layout':
          recorder.setCameraLayout(command.layout)
          publishProgress()
          break
        case 'move-camera-corner':
          recorder.moveCameraToCorner(command.corner)
          publishProgress()
          break
        case 'set-camera-size':
          recorder.setCameraSize(command.size)
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
