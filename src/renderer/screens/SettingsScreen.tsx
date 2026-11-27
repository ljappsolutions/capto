import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import type { VideoQuality } from '@shared/types'
import { SharingSettingsPanel } from '../components/SharingSettingsPanel'
import '../styles/settings.css'

type Tab = 'general' | 'sharing'

const LIMIT_OPTIONS = [
  { label: 'No limit', minutes: 0 },
  { label: '5 minutes', minutes: 5 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 }
]

export function SettingsScreen() {
  const { settings, loading, update } = useSettings()
  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get('tab') === 'sharing' ? 'sharing' : 'general'
  )

  if (loading || !settings) {
    return (
      <div className="app-shell settings">
        <p className="muted">Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="app-shell settings">
      <header>
        <h1>Settings</h1>
        <p className="muted">Preferences are stored locally on this Mac.</p>
      </header>

      <nav className="settings__tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'general'} className={tab === 'general' ? 'tab active' : 'tab'} onClick={() => setTab('general')}>
          General
        </button>
        <button type="button" role="tab" aria-selected={tab === 'sharing'} className={tab === 'sharing' ? 'tab active' : 'tab'} onClick={() => setTab('sharing')}>
          Sharing
        </button>
      </nav>

      {tab === 'sharing' ? <SharingSettingsPanel settings={settings} update={update} /> : null}

      {tab === 'general' ? (
      <section className="panel">
        <div className="field">
          <label className="toggle" htmlFor="login">
            <input
              id="login"
              type="checkbox"
              checked={settings.launchAtLogin}
              onChange={(e) => void update({ launchAtLogin: e.target.checked })}
            />
            Open Capto when I log in to this Mac
          </label>
          {settings.isPackaged ? (
            <p className="muted">
              Starts Capto in the menu bar after login (no main window). You can also change this in
              System Settings → General → Login Items.
            </p>
          ) : (
            <p className="muted">
              Saved for packaged Capto.app builds. While running with <code>yarn dev</code>, macOS
              login items are not modified (to avoid registering Electron).
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="shortcut">Global shortcut</label>
          <input
            id="shortcut"
            type="text"
            value={settings.globalShortcut}
            onChange={(e) => void update({ globalShortcut: e.target.value })}
          />
          <p className="muted">Example: CommandOrControl+Shift+R</p>
        </div>

        <div className="field">
          <label htmlFor="limit">Recording limit</label>
          <select
            id="limit"
            value={settings.maxRecordingMinutes}
            onChange={(e) => void update({ maxRecordingMinutes: Number(e.target.value) })}
          >
            {LIMIT_OPTIONS.some((o) => o.minutes === settings.maxRecordingMinutes) ? null : (
              <option value={settings.maxRecordingMinutes}>{settings.maxRecordingMinutes} minutes</option>
            )}
            {LIMIT_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="muted">Recording stops automatically at the limit. Camera placement is set in the New Recording window.</p>
        </div>

        <div className="field">
          <label htmlFor="quality">Video quality</label>
          <select
            id="quality"
            value={settings.videoQuality}
            onChange={(e) => void update({ videoQuality: e.target.value as VideoQuality })}
          >
            <option value="1440p">1440p (2K) — best for YouTube</option>
            <option value="1080p">1080p — good default</option>
            <option value="720p">720p — smaller files</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="dir">Recordings directory</label>
          <input id="dir" type="text" value={settings.recordingDirectory ?? ''} readOnly />
          <p className="muted">Defaults to Movies/Capto. Recordings are saved as MP4 for QuickTime.</p>
        </div>

        <div className="field">
          <label className="toggle" htmlFor="sysdefault">
            <input
              id="sysdefault"
              type="checkbox"
              checked={settings.defaultSystemAudioEnabled}
              onChange={(e) => void update({ defaultSystemAudioEnabled: e.target.checked })}
            />
            System audio enabled by default
          </label>
        </div>

        <div className="field">
          <label className="toggle" htmlFor="camdefault">
            <input
              id="camdefault"
              type="checkbox"
              checked={settings.defaultCameraEnabled}
              onChange={(e) => void update({ defaultCameraEnabled: e.target.checked })}
            />
            Camera enabled by default
          </label>
        </div>
      </section>
      ) : null}
    </div>
  )
}
