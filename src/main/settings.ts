import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { SETTINGS_FILENAME } from '@shared/constants'
import { DEFAULT_SETTINGS, parseSettings } from '@shared/settings'
import type { AppSettings } from '@shared/types'
import { log } from './logger'

export { parseSettings } from '@shared/settings'

function settingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILENAME)
}

let cached: AppSettings | null = null

export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS }
}

export function loadSettings(): AppSettings {
  if (cached) return { ...cached }

  const path = settingsPath()
  try {
    if (!existsSync(path)) {
      cached = { ...DEFAULT_SETTINGS }
      saveSettings(cached)
      return { ...cached }
    }
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    cached = parseSettings(raw)
    return { ...cached }
  } catch (error) {
    log.error('Failed to load settings; using defaults', {
      error: error instanceof Error ? error.message : String(error)
    })
    cached = { ...DEFAULT_SETTINGS }
    return { ...cached }
  }
}

export function saveSettings(settings: AppSettings): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
  cached = { ...settings }
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const next = parseSettings({ ...loadSettings(), ...partial })
  saveSettings(next)
  applyLoginItemSettings(next.launchAtLogin)
  return { ...next }
}

export function applyLoginItemSettings(openAtLogin: boolean): void {
  // Avoid registering the raw Electron binary as a login item during `yarn dev`.
  if (!app.isPackaged) {
    log.info('Skipping login item settings in unpackaged development build', { openAtLogin })
    return
  }

  try {
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: true,
      type: 'mainAppService'
    })
    log.info('Login item settings applied', { openAtLogin, openAsHidden: true })
  } catch (error) {
    log.warn('Failed to set login item settings', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export function getLaunchAtLoginEffective(): boolean {
  if (!app.isPackaged) {
    return loadSettings().launchAtLogin
  }
  try {
    return Boolean(app.getLoginItemSettings().openAtLogin)
  } catch {
    return loadSettings().launchAtLogin
  }
}

export function resolveRecordingDirectory(settings?: AppSettings): string {
  const current = settings ?? loadSettings()
  if (current.recordingDirectory && current.recordingDirectory.length > 0) {
    return current.recordingDirectory
  }
  return join(app.getPath('videos'), 'Capto')
}
