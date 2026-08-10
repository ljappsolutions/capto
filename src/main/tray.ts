import { app, Menu, nativeImage, Tray } from 'electron'
import { join } from 'node:path'
import { markAppQuitting } from './lifecycle'
import { log } from './logger'
import { showPickerWindow, showRecordingsWindow, showSettingsWindow } from './windows'

let tray: Tray | null = null

function trayIcon(): Electron.NativeImage {
  const iconPath = join(app.getAppPath(), 'resources', 'trayTemplate.png')
  let image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) {
    // 16x16 template-like fallback (black circle) encoded as PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAFUlEQVR42mP8z8BQz0BFwzAqGAAAAAD//wMAAv8B/6m+9QAAAABJRU5ErkJggg==',
      'base64'
    )
    image = nativeImage.createFromBuffer(png)
  }
  image.setTemplateImage(true)
  return image
}

export function createTray(): Tray {
  if (tray) return tray

  tray = new Tray(trayIcon())
  tray.setToolTip('Capto')
  rebuildTrayMenu()
  tray.on('click', () => {
    showPickerWindow()
  })
  log.info('Tray created')
  return tray
}

export function rebuildTrayMenu(): void {
  if (!tray) return

  const menu = Menu.buildFromTemplate([
    {
      label: 'New Recording',
      click: () => {
        showPickerWindow()
      }
    },
    {
      label: 'Recent Recordings',
      click: () => {
        showRecordingsWindow()
      }
    },
    {
      label: 'Settings',
      click: () => {
        showSettingsWindow()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Capto',
      click: () => {
        markAppQuitting()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
