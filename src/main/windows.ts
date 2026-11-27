import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import type { WindowKind } from '@shared/types'
import { isAppQuitting } from './lifecycle'
import { log } from './logger'

const windows = new Map<WindowKind, BrowserWindow>()

function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

function rendererUrl(kind: WindowKind, query?: Record<string, string>): string {
  const params = new URLSearchParams({ window: kind, ...query })
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}?${params.toString()}`
  }
  return `file://${join(__dirname, '../renderer/index.html')}?${params.toString()}`
}

function baseWebPreferences(kind?: WindowKind): Electron.WebPreferences {
  return {
    preload: preloadPath(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    spellcheck: false,
    // Picker hosts MediaRecorder + canvas compositor; must not throttle when unfocused.
    backgroundThrottling: kind === 'picker' ? false : true
  }
}

let recordingHostParked = false

function createWindow(
  kind: WindowKind,
  options: Electron.BrowserWindowConstructorOptions,
  query?: Record<string, string>
): BrowserWindow {
  const existing = windows.get(kind)
  if (existing && !existing.isDestroyed()) {
    if (query) {
      void existing.loadURL(rendererUrl(kind, query))
    }
    existing.show()
    existing.focus()
    return existing
  }

  const win = new BrowserWindow({
    show: false,
    ...options,
    webPreferences: {
      ...baseWebPreferences(kind),
      ...options.webPreferences
    }
  })

  win.on('ready-to-show', () => {
    if (kind === 'controls' || kind === 'countdown') {
      win.showInactive()
    } else {
      win.show()
      win.focus()
    }
  })

  // Keep the picker alive while it hosts the Recorder instance.
  // During quit, allow the close so app.quit() is not cancelled.
  if (kind === 'picker') {
    win.on('close', (event) => {
      if (!isAppQuitting()) {
        event.preventDefault()
        win.hide()
      }
    })
  }

  win.on('closed', () => {
    windows.delete(kind)
  })

  void win.loadURL(rendererUrl(kind, query))
  windows.set(kind, win)
  log.info('Window created', { kind })
  return win
}

export function showPickerWindow(): BrowserWindow {
  const win = createWindow('picker', {
    width: 760,
    height: 820,
    minWidth: 560,
    minHeight: 480,
    title: 'New Recording',
    resizable: true,
    fullscreenable: false,
    trafficLightPosition: { x: 12, y: 12 }
  })
  unparkRecordingHost()
  return win
}

/**
 * Keep the recording-host (picker) window in a shown state so canvas.captureStream
 * and timers keep producing frames, while making it invisible to the user and
 * preferably excluded from screen capture.
 */
export function parkRecordingHost(): void {
  const win = getWindow('picker')
  if (!win || win.isDestroyed()) return

  recordingHostParked = true
  try {
    win.setContentProtection(true)
  } catch {
    // optional on some platforms
  }
  win.setIgnoreMouseEvents(true)
  win.setOpacity(0)
  // Critical: do NOT hide() — hidden BrowserWindows freeze canvas.captureStream.
  win.showInactive()
  log.info('Recording host parked (kept alive for compositor)')
}

export function unparkRecordingHost(): void {
  const win = getWindow('picker')
  recordingHostParked = false
  if (!win || win.isDestroyed()) return

  try {
    win.setContentProtection(false)
  } catch {
    // optional
  }
  win.setIgnoreMouseEvents(false)
  win.setOpacity(1)
  log.info('Recording host unparked')
}

export function isRecordingHostParked(): boolean {
  return recordingHostParked
}

export function showSettingsWindow(query?: Record<string, string>): BrowserWindow {
  return createWindow(
    'settings',
    {
      width: 600,
      height: 720,
      minWidth: 520,
      minHeight: 480,
      title: 'Settings',
      resizable: true,
      fullscreenable: false
    },
    query
  )
}

export function showRecordingsWindow(): BrowserWindow {
  return createWindow('recordings', {
    width: 720,
    height: 620,
    title: 'Recent Recordings',
    resizable: true,
    fullscreenable: false
  })
}

export function showCompleteWindow(recordingId: string): BrowserWindow {
  return createWindow(
    'complete',
    {
      width: 600,
      height: 640,
      title: 'Recording Complete',
      resizable: true,
      fullscreenable: false
    },
    { id: recordingId }
  )
}

export function showControlsWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const width = 640
  const height = 56
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2)
  const y = Math.round(display.workArea.y + 24)

  return createWindow('controls', {
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    hasShadow: true,
    title: 'Recording Controls',
    type: 'panel'
  })
}

export function showCountdownWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const width = 200
  const height = 200
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2)
  const y = Math.round(display.workArea.y + (display.workArea.height - height) / 2)

  return createWindow('countdown', {
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    hasShadow: false,
    title: 'Countdown'
  })
}

export function showExportingWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const width = 420
  const height = 180
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2)
  const y = Math.round(display.workArea.y + (display.workArea.height - height) / 2)

  return createWindow('exporting', {
    width,
    height,
    x,
    y,
    resizable: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    title: 'Exporting Recording'
  })
}

export async function showExportingWindowReady(): Promise<BrowserWindow> {
  const win = showExportingWindow()
  if (!win.webContents.isLoadingMainFrame()) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    return win
  }
  await new Promise<void>((resolve) => {
    win.webContents.once('did-finish-load', () => resolve())
  })
  // Let React mount and subscribe to export progress.
  await new Promise<void>((resolve) => setTimeout(resolve, 50))
  return win
}

export function showWindow(kind: WindowKind, query?: Record<string, string>): BrowserWindow {
  switch (kind) {
    case 'picker':
      return showPickerWindow()
    case 'settings':
      return showSettingsWindow(query)
    case 'recordings':
      return showRecordingsWindow()
    case 'complete':
      return showCompleteWindow(query?.id ?? '')
    case 'controls':
      return showControlsWindow()
    case 'countdown':
      return showCountdownWindow()
    case 'exporting':
      return showExportingWindow()
    default: {
      const _exhaustive: never = kind
      throw new Error(`Unknown window kind: ${_exhaustive}`)
    }
  }
}

export function hideWindow(kind: WindowKind): void {
  const win = windows.get(kind)
  if (win && !win.isDestroyed()) {
    // After a recording, restore opacity before hiding so the next show is normal.
    if (kind === 'picker' && recordingHostParked) {
      unparkRecordingHost()
    }
    win.hide()
  }
}

export function closeWindow(kind: WindowKind, force = false): void {
  const win = windows.get(kind)
  if (win && !win.isDestroyed()) {
    if (force || kind === 'picker') {
      win.destroy()
    } else {
      win.close()
    }
  }
  windows.delete(kind)
}

export function getWindow(kind: WindowKind): BrowserWindow | undefined {
  const win = windows.get(kind)
  if (win && !win.isDestroyed()) return win
  return undefined
}

export function broadcastToWindow(kind: WindowKind, channel: string, payload: unknown): void {
  const win = getWindow(kind)
  win?.webContents.send(channel, payload)
}

export function closeAllWindows(): void {
  for (const kind of [...windows.keys()]) {
    closeWindow(kind, true)
  }
}
