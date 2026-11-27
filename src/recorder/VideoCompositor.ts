import {
  clampCenter,
  computeBubbleRect,
  cornerCenter,
  DEFAULT_CAMERA_OVERLAY,
  parseCameraOverlay
} from '@shared/cameraOverlay'
import { scaleToMaxOutput } from '@shared/dimensions'
import { TARGET_FPS } from '@shared/constants'
import type { CameraLayout, CameraOverlay, CameraPosition } from '@shared/types'
import { stopStream } from './MediaDevices'

export class VideoCompositor {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private desktopVideo: HTMLVideoElement | null = null
  private cameraVideo: HTMLVideoElement | null = null
  private cameraEnabled = false
  private overlay: CameraOverlay = { ...DEFAULT_CAMERA_OVERLAY }
  private layout: CameraLayout = 'overlay'
  private loopTimer: number | null = null
  private outputStream: MediaStream | null = null
  private width = 1280
  private height = 720

  async prepare(options: {
    desktopStream: MediaStream
    cameraStream: MediaStream | null
    cameraEnabled: boolean
    cameraOverlay: CameraOverlay
    cameraLayout: CameraLayout
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
    this.overlay = parseCameraOverlay(options.cameraOverlay)
    this.layout = options.cameraLayout

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

  setOverlay(overlay: CameraOverlay): void {
    this.overlay = parseCameraOverlay(overlay)
  }

  moveToCorner(corner: CameraPosition): void {
    this.overlay = {
      ...this.overlay,
      ...cornerCenter(corner, this.overlay.size, this.width, this.height)
    }
  }

  /** Resize while keeping the bubble anchored inside the frame. */
  setSize(size: number): void {
    const next = parseCameraOverlay({ ...this.overlay, size })
    this.overlay = { ...next, ...clampCenter(next, this.width, this.height) }
  }

  getOverlay(): CameraOverlay {
    return { ...this.overlay }
  }

  getLayout(): CameraLayout {
    return this.layout
  }

  setLayout(layout: CameraLayout): void {
    this.layout = layout
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

  private cameraReady(): boolean {
    return Boolean(this.cameraEnabled && this.cameraVideo && this.cameraVideo.readyState >= 2)
  }

  private drawFrame(): void {
    if (!this.ctx || !this.canvas || !this.desktopVideo) return

    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.width, this.height)

    if (this.layout === 'camera-only' && this.cameraReady()) {
      this.drawVideoCover(this.cameraVideo!, 0, 0, this.width, this.height, this.overlay.mirror)
      return
    }

    if (this.desktopVideo.readyState >= 2) {
      this.ctx.drawImage(this.desktopVideo, 0, 0, this.width, this.height)
    }

    if (this.cameraReady()) {
      this.drawCameraBubble()
    }
  }

  /** Draw `video` scaled to cover the target box (center crop), optionally mirrored. */
  private drawVideoCover(
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number,
    mirror: boolean
  ): void {
    const ctx = this.ctx
    if (!ctx) return
    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 480
    const scale = Math.max(w / vw, h / vh)
    const dw = vw * scale
    const dh = vh * scale
    const dx = x + (w - dw) / 2
    const dy = y + (h - dh) / 2
    ctx.save()
    if (mirror) {
      // Flip around the box's vertical center line.
      ctx.translate(x * 2 + w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, dx, dy, dw, dh)
    ctx.restore()
  }

  private bubblePath(left: number, top: number, side: number, radius: number): void {
    const ctx = this.ctx!
    ctx.beginPath()
    if (radius >= side / 2) {
      ctx.arc(left + side / 2, top + side / 2, side / 2, 0, Math.PI * 2)
    } else if (radius > 0 && typeof ctx.roundRect === 'function') {
      ctx.roundRect(left, top, side, side, radius)
    } else {
      ctx.rect(left, top, side, side)
    }
    ctx.closePath()
  }

  private drawCameraBubble(): void {
    if (!this.ctx || !this.cameraVideo) return

    const { left, top, side, cornerRadius } = computeBubbleRect(
      this.overlay,
      this.width,
      this.height
    )

    // Soft drop shadow under the bubble.
    this.ctx.save()
    this.bubblePath(left, top, side, cornerRadius)
    this.ctx.shadowColor = 'rgba(0,0,0,0.35)'
    this.ctx.shadowBlur = Math.max(6, side * 0.05)
    this.ctx.fillStyle = '#000'
    this.ctx.fill()
    this.ctx.restore()

    this.ctx.save()
    this.bubblePath(left, top, side, cornerRadius)
    this.ctx.clip()
    this.drawVideoCover(this.cameraVideo, left, top, side, side, this.overlay.mirror)
    this.ctx.restore()

    if (this.overlay.border !== 'none') {
      this.ctx.save()
      this.bubblePath(left, top, side, cornerRadius)
      this.ctx.strokeStyle =
        this.overlay.border === 'accent' ? 'rgba(124,137,255,0.95)' : 'rgba(255,255,255,0.55)'
      this.ctx.lineWidth = Math.max(2, side * (this.overlay.border === 'accent' ? 0.03 : 0.02))
      this.ctx.stroke()
      this.ctx.restore()
    }
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
