const TIME_RE = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/

export function parseFfmpegTimeToMs(line: string): number | null {
  const match = TIME_RE.exec(line)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  if (![hours, minutes, seconds].every((n) => Number.isFinite(n))) return null
  return Math.round(((hours * 60 + minutes) * 60 + seconds) * 1000)
}
