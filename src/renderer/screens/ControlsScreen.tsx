import { useEffect, useState, type CSSProperties } from 'react'
import { formatDuration } from '@shared/format'
import type { RecordingState } from '@shared/types'
import '../styles/controls.css'

const dragRegion = { WebkitAppRegion: 'drag' } as CSSProperties
const noDragRegion = { WebkitAppRegion: 'no-drag' } as CSSProperties

export function ControlsScreen() {
  const [state, setState] = useState<RecordingState>('recording')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(false)

  useEffect(() => {
    return window.recorderAPI.onRecorderEvent((event) => {
      if (event.type === 'progress') {
        setState(event.state)
        setElapsedMs(event.elapsedMs)
        setMicEnabled(event.microphoneEnabled)
        setCameraEnabled(event.cameraEnabled)
      } else if (event.type === 'state') {
        setState(event.state)
      }
    })
  }, [])

  const recording = state === 'recording'
  const paused = state === 'paused'

  return (
    <div className="controls" style={dragRegion}>
      <div className="controls__status">
        <span className={`dot${paused ? ' dot--paused' : ''}`} />
        <span className="controls__time">{formatDuration(elapsedMs)}</span>
      </div>

      <div className="controls__actions" style={noDragRegion}>
        <button
          type="button"
          className="btn"
          onClick={() => void window.recorderAPI.sendRecorderCommand({ type: 'toggle-mic' })}
        >
          Mic {micEnabled ? 'On' : 'Off'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => void window.recorderAPI.sendRecorderCommand({ type: 'toggle-camera' })}
        >
          Camera {cameraEnabled ? 'On' : 'Off'}
        </button>
        {recording ? (
          <button
            type="button"
            className="btn"
            onClick={() => void window.recorderAPI.sendRecorderCommand({ type: 'pause' })}
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={!paused}
            onClick={() => void window.recorderAPI.sendRecorderCommand({ type: 'resume' })}
          >
            Resume
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => void window.recorderAPI.sendRecorderCommand({ type: 'stop' })}
        >
          Stop
        </button>
      </div>
    </div>
  )
}
