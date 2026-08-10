import { useSettings } from '../hooks/useSettings'
import type { CameraPosition, VideoQuality } from '@shared/types'
import '../styles/settings.css'

export function SettingsScreen() {
  const { settings, loading, update } = useSettings()

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
          <label htmlFor="cameraPos">Camera position</label>
          <select
            id="cameraPos"
            value={settings.cameraPosition}
            onChange={(e) => void update({ cameraPosition: e.target.value as CameraPosition })}
          >
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="quality">Video quality</label>
          <select
            id="quality"
            value={settings.videoQuality}
            onChange={(e) => void update({ videoQuality: e.target.value as VideoQuality })}
          >
            <option value="1080p">1080p max</option>
            <option value="720p">720p max</option>
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
    </div>
  )
}
