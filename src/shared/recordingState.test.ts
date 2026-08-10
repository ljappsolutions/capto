import { describe, expect, it } from 'vitest'
import { canTransition } from './recordingState'

describe('canTransition', () => {
  it('allows the happy path', () => {
    expect(canTransition('idle', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'ready')).toBe(true)
    expect(canTransition('ready', 'countdown')).toBe(true)
    expect(canTransition('countdown', 'recording')).toBe(true)
    expect(canTransition('recording', 'paused')).toBe(true)
    expect(canTransition('paused', 'recording')).toBe(true)
    expect(canTransition('recording', 'stopping')).toBe(true)
    expect(canTransition('stopping', 'completed')).toBe(true)
  })

  it('rejects invalid jumps', () => {
    expect(canTransition('idle', 'recording')).toBe(false)
    expect(canTransition('completed', 'recording')).toBe(false)
  })
})
