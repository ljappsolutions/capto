// eslint-disable-next-line no-control-regex -- intentional filename sanitization of C0 controls
const UNSAFE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g
const MULTI_SPACE = /\s+/g
const MULTI_DASH = /-+/g

export function sanitizeFilenamePart(input: string, maxLength = 60): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(UNSAFE_CHARS, '')
    .replace(MULTI_SPACE, '-')
    .replace(MULTI_DASH, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, maxLength)

  return cleaned.length > 0 ? cleaned : 'Recording'
}

export function formatRecordingTimestamp(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
}

export function buildRecordingFilename(sourceName: string, date: Date = new Date()): string {
  const stamp = formatRecordingTimestamp(date)
  const safeSource = sanitizeFilenamePart(sourceName)
  return `${stamp}_${safeSource}`
}

export function ensureUniqueBasename(basename: string, existing: Set<string>): string {
  if (!existing.has(basename)) {
    return basename
  }
  let i = 2
  while (existing.has(`${basename}-${i}`)) {
    i += 1
  }
  return `${basename}-${i}`
}
