import { useEffect, useState, type CSSProperties } from 'react'
import { CAMERA_SIZE_PRESETS, nearestCorner } from '@shared/cameraOverlay'
import { formatDuration } from '@shared/format'
import type { CameraLayout, CameraOverlay, CameraPosition, RecordingState } from '@shared/types'
import '../styles/controls.css'

const dragRegion = { WebkitAppRegion: 'drag' } as CSSProperties
const noDragRegion = { WebkitAppRegion: 'no-drag' } as CSSProperties

const SIZE_ORDER = ['S', 'M', 'L'] as const
const CORNER_ORDER: CameraPosition[] = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

function sizeLabel(size: number): (typeof SIZE_ORDER)[number] {
  let best: (typeof SIZE_ORDER)[number] = 'M'
  let bestDiff = Infinity
  for (const k of SIZE_ORDER) {
    const diff = Math.abs(CAMERA_SIZE_PRESETS[k] - size)
    if (diff < bestDiff) {
      best = k
      bestDiff = diff
    }
  }
  return best
}

const send = (command: Parameters<typeof window.recorderAPI.sendRecorderCommand>[0]): void => {
  void window.recorderAPI.sendRecorderCommand(command)
}

export function ControlsScreen() {
  const [state, setState] = useState<RecordingState>('recording')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [overlay, setOverlay] = useState<CameraOverlay | null>(null)
  const [layout, setLayout] = useState<CameraLayout>('overlay')

  useEffect(() => {
    return window.recorderAPI.onRecorderEvent((event) => {
      if (event.type === 'progress') {
        setState(event.state)
        setElapsedMs(event.elapsedMs)
        setMicEnabled(event.microphoneEnabled)
        setCameraEnabled(event.cameraEnabled)
        setRemainingMs(event.remainingMs)
        if (event.cameraOverlay) setOverlay(event.cameraOverlay)
        if (event.cameraLayout) setLayout(event.cameraLayout)
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
        {remainingMs !== null && remainingMs <= 60_000 ? (
          <span className="controls__remaining" title="Time left before the recording limit">
            −{formatDuration(remainingMs)}
          </span>
        ) : null}
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
        {cameraEnabled && overlay ? (
          <>
            {layout === 'overlay' ? (
              <>
                <button
                  type="button"
                  className="btn"
                  title="Change camera size"
                  onClick={() => {
                    const i = SIZE_ORDER.indexOf(sizeLabel(overlay.size))
                    const next = SIZE_ORDER[(i + 1) % SIZE_ORDER.length]
                    send({ type: 'set-camera-size', size: CAMERA_SIZE_PRESETS[next] })
                  }}
                >
                  Size {sizeLabel(overlay.size)}
                </button>
                <button
                  type="button"
                  className="btn"
                  title="Move camera to the next corner"
                  onClick={() => {
                    const i = CORNER_ORDER.indexOf(nearestCorner(overlay))
                    send({
                      type: 'move-camera-corner',
                      corner: CORNER_ORDER[(i + 1) % CORNER_ORDER.length]
                    })
                  }}
                >
                  Move
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="btn"
              title="Switch between screen + camera and camera only"
              onClick={() =>
                send({
                  type: 'set-camera-layout',
                  layout: layout === 'overlay' ? 'camera-only' : 'overlay'
                })
              }
            >
              {layout === 'overlay' ? 'Cam only' : 'Screen'}
            </button>
          </>
        ) : null}
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
