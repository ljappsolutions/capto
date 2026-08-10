import { useCallback, useEffect, useState } from 'react'
import type { PermissionState } from '@shared/types'

const empty: PermissionState = {
  screen: 'unknown',
  microphone: 'unknown',
  camera: 'unknown',
  systemAudio: 'unknown',
  screenRequiresRestart: false
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionState>(empty)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const next = await window.recorderAPI.getPermissions()
      setPermissions(next)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { permissions, loading, refresh }
}
