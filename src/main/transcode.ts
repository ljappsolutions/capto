import { app } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import ffmpegStatic from 'ffmpeg-static'
import { log } from './logger'

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

function runFfmpeg(ffmpeg: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
      if (stderr.length > 8000) {
        stderr = stderr.slice(-4000)
      }
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`))
    })
  })
}

/**
 * Transcode MediaRecorder WebM (VP8/VP9 + Opus) to H.264/AAC MP4 for QuickTime.
 */
export async function convertWebmToMp4(inputPath: string, outputPath: string): Promise<void> {
  const ffmpeg = resolveFfmpegBinary()
  log.info('Starting WebM → MP4 conversion', { inputPath, outputPath, ffmpeg })

  const baseArgs = [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart'
  ]

  try {
    await runFfmpeg(ffmpeg, [...baseArgs, '-c:a', 'aac', '-b:a', '128k', outputPath])
  } catch (error) {
    log.warn('MP4 conversion with audio failed; retrying video-only', {
      error: error instanceof Error ? error.message : String(error)
    })
    await runFfmpeg(ffmpeg, [...baseArgs, '-an', outputPath])
  }

  log.info('WebM → MP4 conversion complete', { outputPath })
}
