import { describe, expect, it } from 'vitest'
import { groupCaptureSources, inferSourceType } from './sources'
import type { CaptureSource } from './types'

describe('groupCaptureSources', () => {
  it('groups and sorts screens and windows', () => {
    const sources: CaptureSource[] = [
      {
        id: 'window:2',
        name: 'Safari',
        type: 'window',
        thumbnailDataUrl: ''
      },
      {
        id: 'screen:1',
        name: 'Display 2',
        type: 'screen',
        thumbnailDataUrl: ''
      },
      {
        id: 'window:1',
        name: 'Finder',
        type: 'window',
        thumbnailDataUrl: ''
      },
      {
        id: 'screen:0',
        name: 'Display 1',
        type: 'screen',
        thumbnailDataUrl: ''
      }
    ]

    const grouped = groupCaptureSources(sources)
    expect(grouped.screens.map((s) => s.name)).toEqual(['Display 1', 'Display 2'])
    expect(grouped.windows.map((s) => s.name)).toEqual(['Finder', 'Safari'])
  })
})

describe('inferSourceType', () => {
  it('prefers desktopCapturer type then id prefix', () => {
    expect(inferSourceType('window:1', 'screen')).toBe('screen')
    expect(inferSourceType('screen:0')).toBe('screen')
    expect(inferSourceType('window:9')).toBe('window')
  })
})
