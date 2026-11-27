import type {
  AppError,
  RecordingOptions,
  RecordingResult,
  RecordingState
} from '@shared/types'

export type RecorderEventMap = {
  state: RecordingState
  progress: { elapsedMs: number; remainingMs: number | null }
  error: AppError
  completed: RecordingResult
}

export type RecorderListener<K extends keyof RecorderEventMap> = (
  payload: RecorderEventMap[K]
) => void

export type { RecordingOptions, RecordingResult, RecordingState, AppError }
