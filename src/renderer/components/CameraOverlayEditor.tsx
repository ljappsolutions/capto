import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { getCameraStream, stopStream } from '@recorder/MediaDevices'
import {
  CAMERA_SIZE_MAX,
  CAMERA_SIZE_MIN,
  CAMERA_SIZE_PRESETS,
  clamp,
  computeBubbleRect,
  cornerCenter,
  snapToCorner
} from '@shared/cameraOverlay'
import type { CameraBorder, CameraLayout, CameraOverlay, CameraPosition, CameraShape } from '@shared/types'

interface Props {
  deviceId: string | null
  enabled: boolean
  overlay: CameraOverlay
  layout: CameraLayout
  /** Thumbnail of the selected screen/window, used as the stage background. */
  backgroundUrl?: string
  onChange: (overlay: CameraOverlay) => void
  /** Called when a drag/resize gesture ends; persist here. */
  onCommit: (overlay: CameraOverlay) => void
  onLayoutChange: (layout: CameraLayout) => void
}

type Gesture =
  | { kind: 'move'; startX: number; startY: number; origin: CameraOverlay }
  | { kind: 'resize'; startX: number; startY: number; origin: CameraOverlay }

const SHAPES: { id: CameraShape; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' }
]

const BORDERS: { id: CameraBorder; label: string }[] = [
  { id: 'subtle', label: 'Subtle' },
  { id: 'accent', label: 'Accent' },
  { id: 'none', label: 'None' }
]

const CORNERS: { id: CameraPosition; label: string }[] = [
  { id: 'top-left', label: '↖' },
  { id: 'top-right', label: '↗' },
  { id: 'bottom-left', label: '↙' },
  { id: 'bottom-right', label: '↘' }
]

export function CameraOverlayEditor({
  deviceId,
  enabled,
  overlay,
  layout,
  backgroundUrl,
  onChange,
  onCommit,
  onLayoutChange
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const latestRef = useRef(overlay)
  const [stage, setStage] = useState({ width: 320, height: 180 })

  latestRef.current = overlay

  // Live camera preview.
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    async function run(): Promise<void> {
      if (!enabled) return
      try {
        stream = await getCameraStream(deviceId)
        if (cancelled) {
          stopStream(stream)
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
      } catch {
        // Preview failure is non-fatal.
      }
    }
    void run()
    return () => {
      cancelled = true
      stopStream(stream)
    }
  }, [deviceId, enabled, layout])

  // Track stage size so the bubble math matches the output frame proportions.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setStage({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function onPointerDown(kind: Gesture['kind']) {
    return (e: ReactPointerEvent<HTMLElement>) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      gestureRef.current = { kind, startX: e.clientX, startY: e.clientY, origin: latestRef.current }
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLElement>): void {
    const g = gestureRef.current
    if (!g) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (g.kind === 'move') {
      const next = {
        ...g.origin,
        x: clamp(g.origin.x + dx / stage.width, 0, 1),
        y: clamp(g.origin.y + dy / stage.height, 0, 1)
      }
      onChange(snapToCorner(next, stage.width, stage.height))
    } else {
      const short = Math.min(stage.width, stage.height)
      // Dragging the bottom-right handle outward grows the bubble.
      const delta = (dx + dy) / 2 / short
      const size = clamp(g.origin.size + delta * 2, CAMERA_SIZE_MIN, CAMERA_SIZE_MAX)
      onChange(snapToCorner({ ...g.origin, size }, stage.width, stage.height, 0))
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLElement>): void {
    if (!gestureRef.current) return
    gestureRef.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    onCommit(latestRef.current)
  }

  function apply(partial: Partial<CameraOverlay>): void {
    const next = snapToCorner({ ...overlay, ...partial }, stage.width, stage.height, 0)
    onChange(next)
    onCommit(next)
  }

  function moveTo(corner: CameraPosition): void {
    apply(cornerCenter(corner, overlay.size, stage.width, stage.height))
  }

  const rect = computeBubbleRect(overlay, stage.width, stage.height)
  const cameraOnly = layout === 'camera-only'

  return (
    <div className="cam-editor">
      <div className="cam-editor__header">
        <span className="cam-editor__title">Camera layout</span>
        <div className="seg" role="radiogroup" aria-label="Layout">
          <button
            type="button"
            role="radio"
            aria-checked={!cameraOnly}
            className={!cameraOnly ? 'seg__btn active' : 'seg__btn'}
            onClick={() => onLayoutChange('overlay')}
          >
            Screen + camera
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={cameraOnly}
            className={cameraOnly ? 'seg__btn active' : 'seg__btn'}
            disabled={!enabled}
            onClick={() => onLayoutChange('camera-only')}
          >
            Camera only
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="cam-editor__stage"
        style={backgroundUrl && !cameraOnly ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
      >
        {!enabled ? (
          <div className="cam-editor__hint">Turn the camera on to place your bubble.</div>
        ) : cameraOnly ? (
          <video
            ref={videoRef}
            className="cam-editor__full"
            style={{ transform: overlay.mirror ? 'scaleX(-1)' : undefined }}
            muted
            playsInline
          />
        ) : (
          <div
            className={`cam-bubble cam-bubble--${overlay.border}`}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.side,
              height: rect.side,
              borderRadius: rect.cornerRadius
            }}
            onPointerDown={onPointerDown('move')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            title="Drag to move"
          >
            <video
              ref={videoRef}
              style={{
                borderRadius: rect.cornerRadius,
                transform: overlay.mirror ? 'scaleX(-1)' : undefined
              }}
              muted
              playsInline
            />
            <span
              className="cam-bubble__handle"
              onPointerDown={onPointerDown('resize')}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              title="Drag to resize"
              aria-label="Resize camera"
            />
          </div>
        )}
      </div>

      {enabled ? (
        <div className="cam-editor__controls">
          {!cameraOnly ? (
            <>
              <div className="seg" aria-label="Shape">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={overlay.shape === s.id ? 'seg__btn active' : 'seg__btn'}
                    onClick={() => apply({ shape: s.id })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="seg" aria-label="Size">
                {(Object.keys(CAMERA_SIZE_PRESETS) as (keyof typeof CAMERA_SIZE_PRESETS)[]).map(
                  (k) => (
                    <button
                      key={k}
                      type="button"
                      className={
                        Math.abs(overlay.size - CAMERA_SIZE_PRESETS[k]) < 0.005
                          ? 'seg__btn active'
                          : 'seg__btn'
                      }
                      onClick={() => apply({ size: CAMERA_SIZE_PRESETS[k] })}
                    >
                      {k}
                    </button>
                  )
                )}
              </div>
              <div className="seg" aria-label="Move to corner">
                {CORNERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="seg__btn"
                    title={`Move to ${c.id.replace('-', ' ')}`}
                    onClick={() => moveTo(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <label className="cam-editor__select">
                Border
                <select
                  value={overlay.border}
                  onChange={(e) => apply({ border: e.target.value as CameraBorder })}
                >
                  {BORDERS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label className="toggle">
            <input
              type="checkbox"
              checked={overlay.mirror}
              onChange={(e) => apply({ mirror: e.target.checked })}
            />
            Mirror
          </label>
        </div>
      ) : null}
    </div>
  )
}
