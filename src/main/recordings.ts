import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
  promises as fs,
  type WriteStream
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { shell } from 'electron'
import {
  FINAL_EXTENSION,
  FINAL_MIME_TYPE,
  INTERMEDIATE_EXTENSION,
  METADATA_DIRNAME,
  METADATA_VERSION,
  PARTIAL_EXTENSION,
  RECOVERIES_DIRNAME
} from '@shared/constants'
import {
  buildRecordingFilename,
  ensureUniqueBasename,
  sanitizeFilenamePart
} from '@shared/filename'
import { parseMetadata } from '@shared/metadata'
import type {
  AppendChunkPayload,
  CreateRecordingPayload,
  ExportProgressEvent,
  FinalizeRecordingPayload,
  RecordingListItem,
  RecordingMetadata,
  RenameRecordingPayload
} from '@shared/types'

export { parseMetadata } from '@shared/metadata'
import { log } from './logger'
import { loadSettings, resolveRecordingDirectory } from './settings'
import { convertWebmToMp4 } from './transcode'

interface ActiveRecording {
  id: string
  partialPath: string
  stream: WriteStream
  nextSequence: number
  pending: Map<number, Buffer>
  payload: CreateRecordingPayload
  createdAt: Date
}

const active = new Map<string, ActiveRecording>()

function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

export function getRecordingsRoot(): string {
  const root = resolveRecordingDirectory(loadSettings())
  ensureDir(root)
  return root
}

function metadataDir(): string {
  const dir = join(getRecordingsRoot(), METADATA_DIRNAME)
  ensureDir(dir)
  return dir
}

function metadataPathFor(id: string): string {
  return join(metadataDir(), `${id}.json`)
}

function existingBasenames(dir: string): Set<string> {
  if (!existsSync(dir)) return new Set()
  const names = new Set<string>()
  for (const entry of readdirSync(dir)) {
    if (entry.endsWith(FINAL_EXTENSION)) {
      names.add(basename(entry, FINAL_EXTENSION))
    } else if (entry.endsWith(INTERMEDIATE_EXTENSION)) {
      names.add(basename(entry, INTERMEDIATE_EXTENSION))
    } else if (entry.endsWith(PARTIAL_EXTENSION)) {
      names.add(basename(entry, PARTIAL_EXTENSION))
    }
  }
  return names
}

function writeMeta(meta: RecordingMetadata): void {
  ensureDir(dirname(metadataPathFor(meta.id)))
  writeFileSync(metadataPathFor(meta.id), JSON.stringify(meta, null, 2), 'utf8')
}

async function loadMetadata(id: string): Promise<RecordingMetadata | null> {
  const path = metadataPathFor(id)
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(await fs.readFile(path, 'utf8')) as unknown
    return parseMetadata(raw)
  } catch {
    return null
  }
}

export async function createRecordingFile(
  payload: CreateRecordingPayload
): Promise<{ path: string }> {
  if (active.size > 0) {
    throw new Error('Only one active recording is supported')
  }

  const root = getRecordingsRoot()
  ensureDir(root)

  const base = ensureUniqueBasename(
    buildRecordingFilename(payload.captureSourceName),
    existingBasenames(root)
  )
  const partialPath = join(root, `${base}${PARTIAL_EXTENSION}`)

  try {
    const stream = createWriteStream(partialPath, { flags: 'w' })
    active.set(payload.id, {
      id: payload.id,
      partialPath,
      stream,
      nextSequence: 0,
      pending: new Map(),
      payload,
      createdAt: new Date()
    })
    log.info('Recording file created', { id: payload.id, partialPath })
    return { path: partialPath }
  } catch (error) {
    log.error('Failed to create recording file', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw new Error('FILE_CREATE_FAILED')
  }
}

function flushPending(session: ActiveRecording): void {
  while (session.pending.has(session.nextSequence)) {
    const buf = session.pending.get(session.nextSequence)
    if (!buf) break
    session.pending.delete(session.nextSequence)
    session.stream.write(buf)
    session.nextSequence += 1
  }
}

export async function appendRecordingChunk(payload: AppendChunkPayload): Promise<void> {
  const session = active.get(payload.id)
  if (!session) {
    throw new Error('Unknown recording session')
  }

  const buf = Buffer.from(payload.chunk)
  if (payload.sequence === session.nextSequence) {
    session.stream.write(buf)
    session.nextSequence += 1
    flushPending(session)
  } else if (payload.sequence > session.nextSequence) {
    session.pending.set(payload.sequence, buf)
  } else {
    log.warn('Ignoring out-of-order/old chunk', {
      id: payload.id,
      sequence: payload.sequence,
      expected: session.nextSequence
    })
  }
}

export type ExportProgressListener = (event: ExportProgressEvent) => void

let exportProgressListener: ExportProgressListener | null = null

export function setExportProgressListener(listener: ExportProgressListener | null): void {
  exportProgressListener = listener
}

function emitExportProgress(event: ExportProgressEvent): void {
  exportProgressListener?.(event)
}

export async function finalizeRecording(
  payload: FinalizeRecordingPayload
): Promise<RecordingMetadata> {
  const session = active.get(payload.id)
  if (!session) {
    throw new Error('Unknown recording session')
  }

  emitExportProgress({
    phase: 'finalizing',
    progress: 0.02,
    message: 'Finalizing recording…'
  })

  flushPending(session)

  await new Promise<void>((resolve, reject) => {
    session.stream.end((err?: Error | null) => {
      if (err) reject(err)
      else resolve()
    })
  })

  const webmPath = session.partialPath.replace(PARTIAL_EXTENSION, INTERMEDIATE_EXTENSION)
  renameSync(session.partialPath, webmPath)

  emitExportProgress({
    phase: 'finalizing',
    progress: 0.05,
    message: 'Preparing export…'
  })

  const mp4Path = webmPath.replace(/\.webm$/i, FINAL_EXTENSION)

  try {
    await convertWebmToMp4(webmPath, mp4Path, {
      crf: session.payload.ffmpegCrf,
      audioBitrateKbps: 160,
      durationMs: payload.durationMs,
      onProgress: (ratio) => {
        const progress = 0.05 + ratio * 0.9
        emitExportProgress({
          phase: 'converting',
          progress,
          message: 'Creating MP4…'
        })
      }
    })
    try {
      await fs.unlink(webmPath)
    } catch {
      log.warn('Could not delete intermediate WebM after MP4 conversion', { webmPath })
    }
  } catch (error) {
    active.delete(payload.id)
    log.error('MP4 conversion failed; leaving WebM in place', {
      error: error instanceof Error ? error.message : String(error),
      webmPath
    })
    throw new Error(
      error instanceof Error
        ? `Failed to create MP4: ${error.message}`
        : 'Failed to create MP4'
    )
  }

  emitExportProgress({
    phase: 'saving',
    progress: 0.97,
    message: 'Saving recording…'
  })

  const stats = statSync(mp4Path)
  const filename = basename(mp4Path)

  const metadata: RecordingMetadata = {
    version: METADATA_VERSION,
    id: session.id,
    filename,
    path: mp4Path,
    createdAt: session.createdAt.toISOString(),
    durationMs: payload.durationMs,
    sizeBytes: stats.size,
    captureSourceName: session.payload.captureSourceName,
    captureSourceType: session.payload.captureSourceType,
    microphoneEnabled: session.payload.microphoneEnabled,
    cameraEnabled: session.payload.cameraEnabled,
    systemAudioEnabled: session.payload.systemAudioEnabled,
    mimeType: FINAL_MIME_TYPE,
    width: session.payload.width,
    height: session.payload.height,
    fps: session.payload.fps
  }

  writeMeta(metadata)
  active.delete(payload.id)
  emitExportProgress({
    phase: 'saving',
    progress: 1,
    message: 'Done'
  })
  log.info('Recording finalized', { id: metadata.id, path: mp4Path, sizeBytes: stats.size })
  return metadata
}

export async function discardRecording(id: string): Promise<void> {
  const session = active.get(id)
  if (!session) return

  await new Promise<void>((resolve) => {
    session.stream.end(() => resolve())
  })

  try {
    if (existsSync(session.partialPath)) {
      await fs.unlink(session.partialPath)
    }
  } catch {
    // ignore
  }
  active.delete(id)
  log.info('Recording discarded', { id })
}

export async function listRecordings(): Promise<RecordingListItem[]> {
  const dir = metadataDir()
  if (!existsSync(dir)) return []

  const entries = await fs.readdir(dir)
  const items: RecordingListItem[] = []

  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue
    try {
      const raw = JSON.parse(await fs.readFile(join(dir, entry), 'utf8')) as unknown
      const meta = parseMetadata(raw)
      if (!meta) continue
      if (!existsSync(meta.path)) continue
      items.push({ metadata: meta })
    } catch {
      // skip corrupt
    }
  }

  items.sort(
    (a, b) =>
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
  )
  return items
}

export async function revealRecording(id: string): Promise<void> {
  const meta = await loadMetadata(id)
  if (!meta || !existsSync(meta.path)) {
    throw new Error('Recording not found')
  }
  shell.showItemInFolder(meta.path)
}

export async function deleteRecording(id: string): Promise<void> {
  const meta = await loadMetadata(id)
  if (!meta) return

  try {
    if (existsSync(meta.path)) {
      await fs.unlink(meta.path)
    }
  } catch (error) {
    log.warn('Failed to delete recording file', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  try {
    if (existsSync(metadataPathFor(id))) {
      await fs.unlink(metadataPathFor(id))
    }
  } catch {
    // ignore
  }

  log.info('Recording deleted', { id })
}

export async function renameRecording(
  payload: RenameRecordingPayload
): Promise<RecordingMetadata> {
  const meta = await loadMetadata(payload.id)
  if (!meta || !existsSync(meta.path)) {
    throw new Error('Recording not found')
  }

  const safe = sanitizeFilenamePart(payload.newBasename, 80)
  const root = dirname(meta.path)
  const ext = meta.path.toLowerCase().endsWith('.webm') ? INTERMEDIATE_EXTENSION : FINAL_EXTENSION
  const unique = ensureUniqueBasename(safe, existingBasenames(root))
  const nextPath = join(root, `${unique}${ext}`)

  await fs.rename(meta.path, nextPath)
  const next: RecordingMetadata = {
    ...meta,
    filename: basename(nextPath),
    path: nextPath
  }
  writeMeta(next)
  log.info('Recording renamed', { id: payload.id, path: nextPath })
  return next
}

export async function getRecordingFileUrl(id: string): Promise<string> {
  const meta = await loadMetadata(id)
  if (!meta || !existsSync(meta.path)) {
    throw new Error('Recording not found')
  }
  return `capto-media://recording/${id}`
}

export function getRecordingAbsolutePath(id: string): string | null {
  const path = metadataPathFor(id)
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    const meta = parseMetadata(raw)
    return meta?.path ?? null
  } catch {
    return null
  }
}

export async function recoverPartialRecordings(): Promise<void> {
  const root = getRecordingsRoot()
  if (!existsSync(root)) return

  const recoveries = join(root, RECOVERIES_DIRNAME)
  const entries = readdirSync(root)

  for (const entry of entries) {
    if (!entry.endsWith(PARTIAL_EXTENSION)) continue
    ensureDir(recoveries)
    const from = join(root, entry)
    const toName = entry.replace(PARTIAL_EXTENSION, INTERMEDIATE_EXTENSION)
    const to = join(recoveries, toName)

    try {
      renameSync(from, to)
      const stats = statSync(to)
      const id = `recovered-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const meta: RecordingMetadata = {
        version: METADATA_VERSION,
        id,
        filename: basename(to),
        path: to,
        createdAt: new Date().toISOString(),
        durationMs: 0,
        sizeBytes: stats.size,
        captureSourceName: 'Recovered recording',
        captureSourceType: 'window',
        microphoneEnabled: false,
        cameraEnabled: false,
        systemAudioEnabled: false,
        mimeType: 'video/webm',
        width: 0,
        height: 0,
        fps: 30,
        recovered: true
      }
      writeMeta(meta)
      log.info('Recovered partial recording', { path: to, id })
    } catch (error) {
      log.warn('Failed to recover partial recording', {
        entry,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

export async function getPartialRecoveries(): Promise<RecordingListItem[]> {
  const all = await listRecordings()
  return all.filter((item) => item.metadata.recovered)
}

export function hasActiveRecording(): boolean {
  return active.size > 0
}

export async function abortActiveRecordingOnShutdown(): Promise<void> {
  for (const [id, session] of active) {
    try {
      flushPending(session)
      await new Promise<void>((resolve) => {
        session.stream.end(() => resolve())
      })
      log.warn('App shutdown during recording; leaving partial file', {
        id,
        path: session.partialPath
      })
    } catch (error) {
      log.error('Failed to flush recording on shutdown', {
        id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
    active.delete(id)
  }
}
