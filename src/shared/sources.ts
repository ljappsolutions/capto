import type { CaptureSource, CaptureSourceType } from './types'

export interface GroupedSources {
  screens: CaptureSource[]
  windows: CaptureSource[]
}

export function groupCaptureSources(sources: CaptureSource[]): GroupedSources {
  const screens: CaptureSource[] = []
  const windows: CaptureSource[] = []

  for (const source of sources) {
    if (source.type === 'screen') {
      screens.push(source)
    } else {
      windows.push(source)
    }
  }

  screens.sort((a, b) => a.name.localeCompare(b.name))
  windows.sort((a, b) => a.name.localeCompare(b.name))

  return { screens, windows }
}

export function inferSourceType(id: string, desktopCapturerType?: string): CaptureSourceType {
  if (desktopCapturerType === 'screen' || desktopCapturerType === 'window') {
    return desktopCapturerType
  }
  return id.startsWith('screen:') ? 'screen' : 'window'
}
