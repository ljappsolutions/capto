import { describe, expect, it } from 'vitest'
import { parseFfmpegTimeToMs } from './ffmpegTime'

describe('parseFfmpegTimeToMs', () => {
  it('parses ffmpeg time stamps', () => {
    expect(parseFfmpegTimeToMs('frame=  10 fps=30 time=00:00:01.50 bitrate=N/A')).toBe(1500)
    expect(parseFfmpegTimeToMs('time=00:01:02.25')).toBe(62250)
  })

  it('returns null when missing', () => {
    expect(parseFfmpegTimeToMs('frame=10 fps=30')).toBeNull()
  })
})
