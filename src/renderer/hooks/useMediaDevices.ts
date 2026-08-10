import { useCallback, useEffect, useState } from 'react'
import { listCameras, listMicrophones } from '@recorder/MediaDevices'
import type { AudioDevice, VideoDevice } from '@shared/types'

export function useMediaDevices() {
  const [mics, setMics] = useState<AudioDevice[]>([])
  const [cameras, setCameras] = useState<VideoDevice[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      // Prompt once so labels become available.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        stream.getTracks().forEach((t) => t.stop())
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((t) => t.stop())
        } catch {
          // ignore
        }
      }
      const [nextMics, nextCams] = await Promise.all([listMicrophones(), listCameras()])
      setMics(nextMics)
      setCameras(nextCams)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const onChange = (): void => {
      void refresh()
    }
    navigator.mediaDevices.addEventListener('devicechange', onChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', onChange)
  }, [refresh])

  return { mics, cameras, loading, refresh }
}
