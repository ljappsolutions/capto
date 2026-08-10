import { stopStream } from './MediaDevices'

export class AudioMixer {
  private context: AudioContext | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private systemGain: GainNode | null = null
  private micGain: GainNode | null = null
  private systemSource: MediaStreamAudioSourceNode | null = null
  private micSource: MediaStreamAudioSourceNode | null = null
  private systemStream: MediaStream | null = null
  private micStream: MediaStream | null = null

  async prepare(options: {
    systemStream: MediaStream | null
    micStream: MediaStream | null
    systemVolume: number
    micVolume: number
  }): Promise<MediaStream | null> {
    await this.dispose()

    const hasSystem = Boolean(options.systemStream?.getAudioTracks().length)
    const hasMic = Boolean(options.micStream?.getAudioTracks().length)
    if (!hasSystem && !hasMic) {
      return null
    }

    this.context = new AudioContext()
    this.destination = this.context.createMediaStreamDestination()
    this.systemGain = this.context.createGain()
    this.micGain = this.context.createGain()
    this.systemGain.gain.value = options.systemVolume
    this.micGain.gain.value = options.micVolume
    this.systemGain.connect(this.destination)
    this.micGain.connect(this.destination)

    if (hasSystem && options.systemStream) {
      this.systemStream = options.systemStream
      this.systemSource = this.context.createMediaStreamSource(options.systemStream)
      this.systemSource.connect(this.systemGain)
    }

    if (hasMic && options.micStream) {
      this.micStream = options.micStream
      this.micSource = this.context.createMediaStreamSource(options.micStream)
      this.micSource.connect(this.micGain)
    }

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    return this.destination.stream
  }

  setSystemVolume(volume: number): void {
    if (this.systemGain) {
      this.systemGain.gain.value = volume
    }
  }

  setMicVolume(volume: number): void {
    if (this.micGain) {
      this.micGain.gain.value = volume
    }
  }

  setSystemEnabled(enabled: boolean): void {
    if (this.systemGain) {
      this.systemGain.gain.value = enabled ? this.systemGain.gain.value || 1 : 0
    }
  }

  setMicrophoneEnabled(enabled: boolean): void {
    if (!this.micStream) return
    for (const track of this.micStream.getAudioTracks()) {
      track.enabled = enabled
    }
  }

  getOutputStream(): MediaStream | null {
    return this.destination?.stream ?? null
  }

  diagnoseSystemAudio(): { available: boolean; muted: boolean; ended: boolean } {
    const track = this.systemStream?.getAudioTracks()[0]
    if (!track) {
      return { available: false, muted: true, ended: true }
    }
    return {
      available: true,
      muted: track.muted,
      ended: track.readyState === 'ended'
    }
  }

  async dispose(): Promise<void> {
    try {
      this.systemSource?.disconnect()
      this.micSource?.disconnect()
      this.systemGain?.disconnect()
      this.micGain?.disconnect()
    } catch {
      // ignore
    }
    this.systemSource = null
    this.micSource = null
    this.systemGain = null
    this.micGain = null
    this.destination = null

    // Do not stop systemStream here — owned by display capture lifecycle.
    this.systemStream = null
    stopStream(this.micStream)
    this.micStream = null

    if (this.context) {
      await this.context.close().catch(() => undefined)
      this.context = null
    }
  }
}
