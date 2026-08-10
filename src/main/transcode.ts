import { app } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import ffmpegStatic from 'ffmpeg-static'
import { parseFfmpegTimeToMs } from '@shared/ffmpegTime'
import { log } from './logger'

export { parseFfmpegTimeToMs } from '@shared/ffmpegTime'

function resolveFfmpegBinary(): string {
  const candidate = ffmpegStatic
  if (!candidate) {
    throw new Error('ffmpeg-static did not provide a binary path')
  }

  // electron-builder packs node_modules into app.asar; native binaries are unpacked.
  const resolved = app.isPackaged
    ? candidate.replace('app.asar', 'app.asar.unpacked')
    : candidate

  if (!existsSync(resolved)) {
    throw new Error(`ffmpeg binary not found at ${resolved}`)
  }
  return resolved
}

function runFfmpeg(
  ffmpeg: string,
  args: string[],
  options?: {
    durationMs?: number
    onProgress?: (ratio: number) => void
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    let lastEmitted = -1

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8')
      stderr += text
      if (stderr.length > 8000) {
        stderr = stderr.slice(-4000)
      }

      const durationMs = options?.durationMs
      const onProgress = options?.onProgress
      if (!durationMs || durationMs <= 0 || !onProgress) return

      const elapsedMs = parseFfmpegTimeToMs(text)
      if (elapsedMs === null) return

      const ratio = Math.min(0.99, Math.max(0, elapsedMs / durationMs))
      const bucket = Math.floor(ratio * 100)
      if (bucket !== lastEmitted) {
        lastEmitted = bucket
        onProgress(ratio)
      }
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        options?.onProgress?.(1)
        resolve()
      } else {
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`))
      }
    })
  })
}

export interface ConvertOptions {
  crf?: number
  audioBitrateKbps?: number
  durationMs?: number
  onProgress?: (ratio: number) => void
}

/**
 * Transcode MediaRecorder WebM (VP8/VP9 + Opus) to H.264/AAC MP4 for QuickTime.
 */
export async function convertWebmToMp4(
  inputPath: string,
  outputPath: string,
  options?: ConvertOptions
): Promise<void> {
  const ffmpeg = resolveFfmpegBinary()
  const crf = options?.crf ?? 22
  const audioBitrate = `${options?.audioBitrateKbps ?? 160}k`
  log.info('Starting WebM → MP4 conversion', { inputPath, outputPath, ffmpeg, crf })

  const baseArgs = [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    'libx264',
    '-preset',
    'superfast',
    '-crf',
    String(crf),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart'
  ]

  const runOptions = {
    durationMs: options?.durationMs,
    onProgress: options?.onProgress
  }

  try {
    await runFfmpeg(
      ffmpeg,
      [...baseArgs, '-c:a', 'aac', '-b:a', audioBitrate, outputPath],
      runOptions
    )
  } catch (error) {
    log.warn('MP4 conversion with audio failed; retrying video-only', {
      error: error instanceof Error ? error.message : String(error)
    })
    await runFfmpeg(ffmpeg, [...baseArgs, '-an', outputPath], runOptions)
  }

  log.info('WebM → MP4 conversion complete', { outputPath })
}
