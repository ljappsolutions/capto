import { desktopCapturer, session } from 'electron'
import { inferSourceType } from '@shared/sources'
import type { CaptureSource } from '@shared/types'
import { log } from './logger'

let selectedSourceId: string | null = null
let selectedIncludeSystemAudio = true
let handlerInstalled = false

export function setSelectedCaptureSource(sourceId: string | null): void {
  selectedSourceId = sourceId
  log.info('Selected capture source updated', { sourceId })
}

export function setSystemAudioPreference(enabled: boolean): void {
  selectedIncludeSystemAudio = enabled
}

export function getSelectedCaptureSourceId(): string | null {
  return selectedSourceId
}

export async function getCaptureSources(): Promise<CaptureSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true
  })

  const mapped: CaptureSource[] = sources.map((source) => {
    const type = inferSourceType(source.id, source.id.startsWith('screen:') ? 'screen' : 'window')
    return {
      id: source.id,
      name: source.name,
      type,
      thumbnailDataUrl: source.thumbnail.isEmpty()
        ? ''
        : source.thumbnail.toDataURL(),
      appIconDataUrl: source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.toDataURL() : undefined,
      displayId: source.display_id || undefined
    }
  })

  log.info('Capture sources enumerated', {
    screens: mapped.filter((s) => s.type === 'screen').length,
    windows: mapped.filter((s) => s.type === 'window').length
  })

  return mapped
}

export function installDisplayMediaHandler(): void {
  if (handlerInstalled) return

  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 1, height: 1 },
        fetchWindowIcons: false
      })

      const selected =
        (selectedSourceId
          ? sources.find((source) => source.id === selectedSourceId)
          : undefined) ?? undefined

      if (!selected) {
        log.warn('Display media request failed: selected source missing', {
          selectedSourceId
        })
        callback({})
        return
      }

      if (selectedIncludeSystemAudio) {
        callback({
          video: selected,
          audio: 'loopback'
        })
      } else {
        callback({
          video: selected
        })
      }

      log.info('Display media request fulfilled', {
        sourceId: selected.id,
        systemAudio: selectedIncludeSystemAudio
      })
    } catch (error) {
      log.error('Display media handler error', {
        error: error instanceof Error ? error.message : String(error)
      })
      callback({})
    }
  })

  handlerInstalled = true
  log.info('Display media request handler installed')
}
