import { useCallback, useEffect, useMemo, useState } from 'react'
import { groupCaptureSources } from '@shared/sources'
import type { CaptureSource } from '@shared/types'

export function useCaptureSources() {
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await window.recorderAPI.getCaptureSources()
      setSources(next)
      setSelectedId((prev) => {
        if (prev && next.some((s) => s.id === prev)) return prev
        return next[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list capture sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const grouped = useMemo(() => groupCaptureSources(sources), [sources])
  const selected = sources.find((s) => s.id === selectedId) ?? null

  return {
    sources,
    grouped,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    refresh
  }
}
