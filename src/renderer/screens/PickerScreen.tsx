import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_CAMERA_OVERLAY } from '@shared/cameraOverlay'
import type { CameraLayout, CameraOverlay, VideoQuality } from '@shared/types'
import { CameraOverlayEditor } from '../components/CameraOverlayEditor'
import { PermissionRow } from '../components/PermissionRow'
import { SourceCard } from '../components/SourceCard'
import { useCaptureSources } from '../hooks/useCaptureSources'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { usePermissions } from '../hooks/usePermissions'
import { useRecorder } from '../hooks/useRecorder'
import { useRecorderHost } from '../hooks/useRecorderHost'
import { useSettings } from '../hooks/useSettings'
import '../styles/picker.css'

type Tab = 'screens' | 'windows'

export function PickerScreen() {
  useRecorderHost()
  const { grouped, selected, selectedId, setSelectedId, loading, error, refresh } =
    useCaptureSources()
  const { permissions, refresh: refreshPermissions } = usePermissions()
  const { mics, cameras } = useMediaDevices()
  const { settings, update } = useSettings()
  const { prepare, start, state, error: recorderError } = useRecorder()

  const [tab, setTab] = useState<Tab>('windows')
  const [microphoneId, setMicrophoneId] = useState<string | null>(null)
  const [cameraId, setCameraId] = useState<string | null>(null)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(true)
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true)
  const [videoQuality, setVideoQuality] = useState<VideoQuality>('1080p')
  const [cameraOverlay, setCameraOverlay] = useState<CameraOverlay>(DEFAULT_CAMERA_OVERLAY)
  const [cameraLayout, setCameraLayout] = useState<CameraLayout>('overlay')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    setMicrophoneId(settings.defaultMicrophoneId)
    setCameraId(settings.defaultCameraId)
    setCameraEnabled(settings.defaultCameraEnabled)
    setSystemAudioEnabled(settings.defaultSystemAudioEnabled)
    setVideoQuality(settings.videoQuality)
    setCameraOverlay(settings.cameraOverlay)
    setCameraLayout(settings.cameraLayout)
    // Only seed local state from the first settings load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings === null])

  const list = tab === 'screens' ? grouped.screens : grouped.windows

  const canStart = useMemo(() => {
    return (
      Boolean(selected) &&
      permissions.screen === 'granted' &&
      !busy &&
      state !== 'preparing' &&
      state !== 'countdown' &&
      state !== 'recording' &&
      state !== 'paused'
    )
  }, [selected, permissions.screen, busy, state])

  async function onStart(): Promise<void> {
    if (!selected || !settings) return
    setBusy(true)
    setLocalError(null)
    try {
      await update({
        defaultMicrophoneId: microphoneId,
        defaultCameraId: cameraId,
        defaultCameraEnabled: cameraEnabled,
        defaultSystemAudioEnabled: systemAudioEnabled,
        videoQuality,
        cameraOverlay,
        cameraLayout
      })

      await prepare({
        captureSourceId: selected.id,
        captureSourceName: selected.name,
        captureSourceType: selected.type,
        microphoneEnabled,
        microphoneDeviceId: microphoneId,
        cameraEnabled,
        cameraDeviceId: cameraId,
        systemAudioEnabled,
        cameraOverlay,
        cameraLayout: cameraEnabled ? cameraLayout : 'overlay',
        systemVolume: settings.systemVolume,
        micVolume: settings.micVolume,
        videoQuality,
        maxDurationMs: settings.maxRecordingMinutes * 60_000
      })
      await start()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to start recording')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell picker">
      <header className="picker__header">
        <div>
          <h1>New Recording</h1>
          <p className="muted">Choose a screen or window, then start recording.</p>
        </div>
        <button type="button" className="btn" onClick={() => void refresh()}>
          Refresh
        </button>
      </header>

      <div className="picker__tabs">
        <button
          type="button"
          className={tab === 'screens' ? 'tab active' : 'tab'}
          onClick={() => setTab('screens')}
        >
          Screens ({grouped.screens.length})
        </button>
        <button
          type="button"
          className={tab === 'windows' ? 'tab active' : 'tab'}
          onClick={() => setTab('windows')}
        >
          Windows ({grouped.windows.length})
        </button>
      </div>

      <div className="picker__sources">
        {loading ? <p className="muted">Loading sources…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
        {!loading && list.length === 0 ? (
          <p className="muted">No {tab} available. Grant Screen Recording permission and refresh.</p>
        ) : null}
        <div className="source-grid">
          {list.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              selected={source.id === selectedId}
              onSelect={() => setSelectedId(source.id)}
            />
          ))}
        </div>
      </div>

      <section className="picker__options panel">
        <div className="picker__options-grid">
          <div className="field">
            <label htmlFor="mic">Microphone</label>
            <div className="row">
              <select
                id="mic"
                value={microphoneEnabled ? (microphoneId ?? '') : 'off'}
                onChange={(e) => {
                  if (e.target.value === 'off') {
                    setMicrophoneEnabled(false)
                    return
                  }
                  setMicrophoneEnabled(true)
                  setMicrophoneId(e.target.value || null)
                }}
              >
                <option value="off">Off</option>
                <option value="">System default</option>
                {mics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="cam">Camera</label>
            <select
              id="cam"
              value={cameraEnabled ? (cameraId ?? '') : 'off'}
              onChange={(e) => {
                if (e.target.value === 'off') {
                  setCameraEnabled(false)
                  return
                }
                setCameraEnabled(true)
                setCameraId(e.target.value || null)
              }}
            >
              <option value="off">Off</option>
              <option value="">System default</option>
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sysaudio">System Audio</label>
            <label className="toggle">
              <input
                id="sysaudio"
                type="checkbox"
                checked={systemAudioEnabled}
                onChange={(e) => setSystemAudioEnabled(e.target.checked)}
              />
              Include computer audio
            </label>
          </div>

          <div className="field">
            <label htmlFor="quality">Video quality</label>
            <select
              id="quality"
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value as VideoQuality)}
            >
              <option value="1440p">1440p (2K) — best for YouTube</option>
              <option value="1080p">1080p — good default</option>
              <option value="720p">720p — smaller files</option>
            </select>
          </div>

        </div>
        <CameraOverlayEditor
          deviceId={cameraId}
          enabled={cameraEnabled}
          overlay={cameraOverlay}
          layout={cameraLayout}
          backgroundUrl={selected?.thumbnailDataUrl}
          onChange={setCameraOverlay}
          onCommit={(next) => void update({ cameraOverlay: next })}
          onLayoutChange={(next) => {
            setCameraLayout(next)
            void update({ cameraLayout: next })
          }}
        />
      </section>

      <section className="picker__permissions panel">
        <h2>Permissions</h2>
        <PermissionRow
          label="Screen Recording"
          status={permissions.screen}
          required
          onOpenSettings={() => void window.recorderAPI.openScreenRecordingSettings()}
          onCheckAgain={() => void refreshPermissions()}
        />
        {permissions.screen !== 'granted' ? (
          <p className="muted">
            Click <strong>Open System Settings</strong> first — Capto probes screen capture so macOS
            adds this process to the list. In development the entry is named <strong>Electron</strong>;
            in a packaged build it appears as <strong>Capto</strong>. Enable it, then quit and reopen
            the app.
          </p>
        ) : null}
        <PermissionRow
          label="Microphone"
          status={permissions.microphone}
          onRequest={() =>
            void window.recorderAPI.requestMicrophoneAccess().then(() => refreshPermissions())
          }
          onOpenSettings={() => void window.recorderAPI.openMicrophoneSettings()}
          onCheckAgain={() => void refreshPermissions()}
        />
        <PermissionRow
          label="Camera"
          status={permissions.camera}
          onRequest={() =>
            void window.recorderAPI.requestCameraAccess().then(() => refreshPermissions())
          }
          onOpenSettings={() => void window.recorderAPI.openCameraSettings()}
          onCheckAgain={() => void refreshPermissions()}
        />
        <PermissionRow
          label="System Audio"
          status={permissions.systemAudio}
          onOpenSettings={() => void window.recorderAPI.openScreenRecordingSettings()}
          onCheckAgain={() => void refreshPermissions()}
        />
        <p className="muted">
          After granting Screen Recording in System Settings, you may need to quit and reopen Capto
          for the change to apply.
        </p>
      </section>

      <footer className="picker__footer">
        <div>
          {localError || recorderError?.message ? (
            <p className="error-text">{localError ?? recorderError?.message}</p>
          ) : (
            <p className="muted">
              {selected ? `Selected: ${selected.name}` : 'Select a capture source'}
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canStart}
          onClick={() => void onStart()}
        >
          {busy || state === 'preparing' || state === 'countdown'
            ? 'Starting…'
            : 'Start Recording'}
        </button>
      </footer>
    </div>
  )
}
