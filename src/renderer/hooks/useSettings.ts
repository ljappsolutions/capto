import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, AppSettingsView } from '@shared/types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettingsView | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await window.recorderAPI.getSettings()
      setSettings(next)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    const next = await window.recorderAPI.updateSettings(partial)
    setSettings(next)
    return next
  }, [])

  return { settings, loading, refresh, update }
}
