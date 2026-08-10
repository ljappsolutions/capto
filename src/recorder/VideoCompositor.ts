import { scaleToMaxOutput } from '@shared/dimensions'
import { TARGET_FPS } from '@shared/constants'
import type { CameraPosition } from '@shared/types'
import { stopStream } from './MediaDevices'

export class VideoCompositor {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private desktopVideo: HTMLVideoElement | null = null
  private cameraVideo: HTMLVideoElement | null = null
  private cameraEnabled = false
  private cameraPosition: CameraPosition = 'bottom-right'
  private loopTimer: number | null = null
  private outputStream: MediaStream | null = null
  private width = 1280
  private height = 720

  async prepare(options: {
    desktopStream: MediaStream
    cameraStream: MediaStream | null
    cameraEnabled: boolean
    cameraPosition: CameraPosition
    maxWidth?: number
    maxHeight?: number
  }): Promise<MediaStream> {
    await this.dispose()

    const track = options.desktopStream.getVideoTracks()[0]
    const settings = track?.getSettings()
    const sourceW = settings?.width ?? 1280
    const sourceH = settings?.height ?? 720
    const scaled = scaleToMaxOutput(
      { width: sourceW, height: sourceH },
      options.maxWidth,
      options.maxHeight
    )
    this.width = scaled.width
    this.height = scaled.height
    this.cameraEnabled = options.cameraEnabled && Boolean(options.cameraStream)
    this.cameraPosition = options.cameraPosition

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.position = 'fixed'
    this.canvas.style.left = '-99999px'
    this.canvas.style.top = '-99999px'
    document.body.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true })

    this.desktopVideo = document.createElement('video')
    this.desktopVideo.muted = true
    this.desktopVideo.playsInline = true
    this.desktopVideo.srcObject = options.desktopStream
    await this.desktopVideo.play()

    if (options.cameraStream && this.cameraEnabled) {
      this.cameraVideo = document.createElement('video')
      this.cameraVideo.muted = true
      this.cameraVideo.playsInline = true
      this.cameraVideo.srcObject = options.cameraStream
      await this.cameraVideo.play()
    }

    // Draw at least one frame before captureStream so the track has content.
    this.drawFrame()
    this.outputStream = this.canvas.captureStream(TARGET_FPS)
    this.startLoop()
    return this.outputStream
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }

  setCameraEnabled(enabled: boolean): void {
    this.cameraEnabled = enabled && Boolean(this.cameraVideo)
  }

  setCameraPosition(position: CameraPosition): void {
    this.cameraPosition = position
  }

  getOutputStream(): MediaStream | null {
    return this.outputStream
  }

  /** Force a paint; useful after UI overlays (countdown) are dismissed. */
  paintNow(): void {
    this.drawFrame()
  }

  private startLoop(): void {
    this.stopLoop()
    // Prefer setInterval over rAF: rAF pauses when the hosting BrowserWindow is
    // hidden/backgrounded, which freezes canvas.captureStream to a single frame.
    const intervalMs = Math.max(1, Math.round(1000 / TARGET_FPS))
    this.loopTimer = window.setInterval(() => {
      this.drawFrame()
    }, intervalMs)
  }

  private stopLoop(): void {
    if (this.loopTimer !== null) {
      clearInterval(this.loopTimer)
      this.loopTimer = null
    }
  }

  private drawFrame(): void {
    if (!this.ctx || !this.canvas || !this.desktopVideo) return

    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.width, this.height)

    if (this.desktopVideo.readyState >= 2) {
      this.ctx.drawImage(this.desktopVideo, 0, 0, this.width, this.height)
    }

    if (this.cameraEnabled && this.cameraVideo && this.cameraVideo.readyState >= 2) {
      this.drawCameraBubble()
    }
  }

  private drawCameraBubble(): void {
    if (!this.ctx || !this.cameraVideo) return

    const padding = Math.round(Math.min(this.width, this.height) * 0.03)
    const diameter = Math.round(Math.min(this.width, this.height) * 0.22)
    const radius = diameter / 2

    let cx = padding + radius
    let cy = padding + radius

    if (this.cameraPosition === 'top-right' || this.cameraPosition === 'bottom-right') {
      cx = this.width - padding - radius
    }
    if (this.cameraPosition === 'bottom-left' || this.cameraPosition === 'bottom-right') {
      cy = this.height - padding - radius
    }

    const video = this.cameraVideo
    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 480
    const scale = Math.max(diameter / vw, diameter / vh)
    const dw = vw * scale
    const dh = vh * scale
    const dx = cx - dw / 2
    const dy = cy - dh / 2

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.closePath()
    this.ctx.clip()
    this.ctx.drawImage(video, dx, dy, dw, dh)
    this.ctx.restore()

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    this.ctx.lineWidth = Math.max(2, diameter * 0.02)
    this.ctx.shadowColor = 'rgba(0,0,0,0.35)'
    this.ctx.shadowBlur = 8
    this.ctx.stroke()
    this.ctx.restore()
  }

  async dispose(): Promise<void> {
    this.stopLoop()

    if (this.outputStream) {
      stopStream(this.outputStream)
      this.outputStream = null
    }

    if (this.desktopVideo) {
      this.desktopVideo.pause()
      this.desktopVideo.srcObject = null
      this.desktopVideo = null
    }

    if (this.cameraVideo) {
      this.cameraVideo.pause()
      this.cameraVideo.srcObject = null
      this.cameraVideo = null
    }

    if (this.canvas?.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
    this.canvas = null
    this.ctx = null
  }
}
