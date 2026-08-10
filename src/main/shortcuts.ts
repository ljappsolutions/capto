import { globalShortcut } from 'electron'
import { DEFAULT_GLOBAL_SHORTCUT } from '@shared/constants'
import { log } from './logger'
import { loadSettings } from './settings'
import { showPickerWindow } from './windows'

let registeredAccelerator: string | null = null

export function registerGlobalShortcut(accelerator?: string): boolean {
  const shortcut = accelerator ?? loadSettings().globalShortcut ?? DEFAULT_GLOBAL_SHORTCUT

  if (registeredAccelerator) {
    globalShortcut.unregister(registeredAccelerator)
    registeredAccelerator = null
  }

  try {
    const ok = globalShortcut.register(shortcut, () => {
      log.info('Global shortcut triggered', { shortcut })
      showPickerWindow()
    })

    if (!ok) {
      log.warn('Global shortcut registration failed', { shortcut })
      return false
    }

    registeredAccelerator = shortcut
    log.info('Global shortcut registered', { shortcut })
    return true
  } catch (error) {
    log.warn('Global shortcut registration threw', {
      shortcut,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll()
  registeredAccelerator = null
}
