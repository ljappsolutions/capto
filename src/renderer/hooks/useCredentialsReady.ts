import { useEffect, useState } from 'react'
import type { StorageProviderId } from '@shared/types'

/** Whether credentials are stored for `provider`. Re-checks when the window regains focus. */
export function useCredentialsReady(provider: StorageProviderId | null): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = (): void => {
      if (!provider) {
        setReady(false)
        return
      }
      void window.recorderAPI.getCredentialStatuses().then((statuses) => {
        if (!cancelled) setReady(Boolean(statuses.find((s) => s.provider === provider)?.configured))
      })
    }
    check()
    window.addEventListener('focus', check)
    return () => {
      cancelled = true
      window.removeEventListener('focus', check)
    }
  }, [provider])

  return ready
}
