import { useEffect, useRef } from 'react'
import { getCameraStream, stopStream } from '@recorder/MediaDevices'

interface Props {
  deviceId: string | null
  enabled: boolean
}

export function CameraPreview({ deviceId, enabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    async function run(): Promise<void> {
      if (!enabled) {
        if (videoRef.current) videoRef.current.srcObject = null
        return
      }
      try {
        stream = await getCameraStream(deviceId)
        if (cancelled) {
          stopStream(stream)
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        // Preview failure is non-fatal.
      }
    }

    void run()
    return () => {
      cancelled = true
      stopStream(stream)
    }
  }, [deviceId, enabled])

  if (!enabled) {
    return <div className="camera-preview camera-preview--off">Camera off</div>
  }

  return (
    <div className="camera-preview">
      <video ref={videoRef} muted playsInline />
    </div>
  )
}
