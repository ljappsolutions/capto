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
    // Pick up changes made in the Settings window.
    const onFocus = (): void => {
      void window.recorderAPI.getSettings().then(setSettings)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const update = useCallback(async (partial: Partial<AppSettings>) => {
    // Optimistic: controlled inputs reflect the change immediately instead of
    // snapping back until the main process replies.
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev))
    try {
      const next = await window.recorderAPI.updateSettings(partial)
      setSettings(next)
      return next
    } catch (error) {
      setSettings(await window.recorderAPI.getSettings())
      throw error
    }
  }, [])

  return { settings, loading, refresh, update }
}
