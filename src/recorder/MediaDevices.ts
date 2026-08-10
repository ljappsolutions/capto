import type { AudioDevice, VideoDevice } from '@shared/types'

export async function listMicrophones(): Promise<AudioDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'audioinput')
    .map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `Microphone ${index + 1}`,
      kind: 'audioinput' as const
    }))
}

export async function listCameras(): Promise<VideoDevice[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput')
    .map((d, index) => ({
      deviceId: d.deviceId,
      label: d.label || `Camera ${index + 1}`,
      kind: 'videoinput' as const
    }))
}

export async function getMicrophoneStream(deviceId: string | null): Promise<MediaStream> {
  const audio: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
  if (deviceId) {
    audio.deviceId = { ideal: deviceId }
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio, video: false })
  } catch {
    // Fall back to default device if preferred ID is unavailable.
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })
  }
}

export async function getCameraStream(deviceId: string | null): Promise<MediaStream> {
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
  if (deviceId) {
    video.deviceId = { ideal: deviceId }
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false })
  } catch {
    return navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false
    })
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    track.stop()
  }
}
