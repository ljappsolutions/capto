import type { RecordingState } from './types'

const TRANSITIONS: Record<RecordingState, readonly RecordingState[]> = {
  idle: ['preparing'],
  preparing: ['ready', 'error', 'idle'],
  ready: ['countdown', 'stopping', 'error', 'idle'],
  countdown: ['recording', 'stopping', 'error', 'idle'],
  recording: ['paused', 'stopping', 'error'],
  paused: ['recording', 'stopping', 'error'],
  stopping: ['completed', 'idle', 'error'],
  completed: ['idle', 'preparing'],
  error: ['idle', 'preparing']
}

export function canTransition(from: RecordingState, to: RecordingState): boolean {
  return TRANSITIONS[from].includes(to)
}
