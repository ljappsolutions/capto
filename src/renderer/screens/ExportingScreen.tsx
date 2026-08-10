import { useEffect, useState } from 'react'
import type { ExportProgressEvent } from '@shared/types'
import '../styles/exporting.css'

const INITIAL: ExportProgressEvent = {
  phase: 'finalizing',
  progress: 0,
  message: 'Starting export…'
}

export function ExportingScreen() {
  const [event, setEvent] = useState<ExportProgressEvent>(INITIAL)

  useEffect(() => {
    return window.recorderAPI.onExportProgress((next) => {
      setEvent(next)
    })
  }, [])

  const percent = Math.round(Math.min(1, Math.max(0, event.progress)) * 100)

  return (
    <div className="app-shell exporting">
      <h1>Creating MP4…</h1>
      <p className="muted">{event.message}</p>
      <div
        className="exporting__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Export progress"
      >
        <div className="exporting__bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="exporting__percent">{percent}%</p>
    </div>
  )
}
