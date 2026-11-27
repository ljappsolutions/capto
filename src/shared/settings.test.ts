import { describe, expect, it } from 'vitest'
import { parseSettings } from './settings'

describe('parseSettings', () => {
  it('returns defaults for invalid input', () => {
    const settings = parseSettings(null)
    expect(settings.launchAtLogin).toBe(true)
    expect(settings.globalShortcut).toBe('CommandOrControl+Shift+R')
    expect(settings.cameraOverlay.shape).toBe('circle')
    expect(settings.maxRecordingMinutes).toBe(0)
    expect(settings.sharing.provider).toBeNull()
  })

  it('merges valid partial values', () => {
    const settings = parseSettings({
      launchAtLogin: false,
      videoQuality: '1440p',
      micVolume: 0.5,
      cameraPosition: 'top-left',
      junk: true
    })
    expect(settings.launchAtLogin).toBe(false)
    expect(settings.videoQuality).toBe('1440p')
    expect(settings.micVolume).toBe(0.5)
    expect(settings.cameraOverlay.x).toBeLessThan(0.5)
    expect(settings.cameraOverlay.y).toBeLessThan(0.5)
  })

  it('clamps the recording limit', () => {
    expect(parseSettings({ maxRecordingMinutes: -5 }).maxRecordingMinutes).toBe(0)
    expect(parseSettings({ maxRecordingMinutes: 100000 }).maxRecordingMinutes).toBe(480)
  })

  it('does not share default objects between parses', () => {
    const a = parseSettings(null)
    a.sharing.prefix = 'mutated'
    expect(parseSettings(null).sharing.prefix).toBe('capto')
  })

  it('clamps volumes', () => {
    expect(parseSettings({ systemVolume: 99 }).systemVolume).toBe(2)
    expect(parseSettings({ micVolume: -1 }).micVolume).toBe(0)
  })
})
