import { useCallback, useEffect, useState } from 'react'
import { getRecorder } from '@recorder/Recorder'
import type { AppError, RecordingOptions, RecordingState } from '@shared/types'
import { MAX_RECORDING_DURATION_MS } from '@shared/constants'

export function useRecorder() {
  const recorder = getRecorder()
  const [state, setState] = useState<RecordingState>(recorder.getState())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [remainingMs, setRemainingMs] = useState(MAX_RECORDING_DURATION_MS)
  const [error, setError] = useState<AppError | null>(null)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(false)

  useEffect(() => {
    const offState = recorder.on('state', setState)
    const offProgress = recorder.on('progress', ({ elapsedMs: e, remainingMs: r }) => {
      setElapsedMs(e)
      setRemainingMs(r)
    })
    const offError = recorder.on('error', setError)
    return () => {
      offState()
      offProgress()
      offError()
    }
  }, [recorder])

  const prepare = useCallback(
    async (options: RecordingOptions) => {
      setError(null)
      setMicEnabled(options.microphoneEnabled)
      setCameraEnabled(options.cameraEnabled)
      await recorder.prepare(options)
    },
    [recorder]
  )

  const start = useCallback(async () => {
    setError(null)
    await recorder.start()
  }, [recorder])

  const pause = useCallback(() => {
    recorder.pause()
  }, [recorder])

  const resume = useCallback(() => {
    recorder.resume()
  }, [recorder])

  const stop = useCallback(async () => {
    return recorder.stop()
  }, [recorder])

  const toggleMic = useCallback(() => {
    const next = !recorder.isMicrophoneEnabled()
    recorder.setMicrophoneEnabled(next)
    setMicEnabled(next)
  }, [recorder])

  const toggleCamera = useCallback(() => {
    const next = !recorder.isCameraEnabled()
    recorder.setCameraEnabled(next)
    setCameraEnabled(next)
  }, [recorder])

  return {
    state,
    elapsedMs,
    remainingMs,
    error,
    micEnabled,
    cameraEnabled,
    prepare,
    start,
    pause,
    resume,
    stop,
    toggleMic,
    toggleCamera
  }
}
