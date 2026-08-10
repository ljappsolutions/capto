import { describe, expect, it } from 'vitest'
import { parseSettings } from './settings'

describe('parseSettings', () => {
  it('returns defaults for invalid input', () => {
    const settings = parseSettings(null)
    expect(settings.launchAtLogin).toBe(true)
    expect(settings.globalShortcut).toBe('CommandOrControl+Shift+R')
    expect(settings.cameraPosition).toBe('bottom-right')
  })

  it('merges valid partial values', () => {
    const settings = parseSettings({
      launchAtLogin: false,
      videoQuality: '720p',
      micVolume: 0.5,
      cameraPosition: 'top-left',
      junk: true
    })
    expect(settings.launchAtLogin).toBe(false)
    expect(settings.videoQuality).toBe('720p')
    expect(settings.micVolume).toBe(0.5)
    expect(settings.cameraPosition).toBe('top-left')
  })

  it('clamps volumes', () => {
    expect(parseSettings({ systemVolume: 99 }).systemVolume).toBe(2)
    expect(parseSettings({ micVolume: -1 }).micVolume).toBe(0)
  })
})
