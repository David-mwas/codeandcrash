// Sound system using Web Audio API for game audio
export class SoundManager {
  private audioContext: AudioContext | null = null
  private enabled = true
  private volume = 0.3

  constructor() {
    if (typeof window !== "undefined") {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  private ensureContext() {
    if (this.audioContext?.state === "suspended") {
      this.audioContext.resume()
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  // Generate a simple oscillator-based sound
  private playTone(frequency: number, duration: number, type: OscillatorType = "square", volume = 1) {
    if (!this.audioContext || !this.enabled) return
    this.ensureContext()

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)

    const actualVolume = this.volume * volume * 0.3
    gainNode.gain.setValueAtTime(actualVolume, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  // Play noise-based sound (for explosions, hits)
  private playNoise(duration: number, volume = 1) {
    if (!this.audioContext || !this.enabled) return
    this.ensureContext()

    const bufferSize = this.audioContext.sampleRate * duration
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()
    const filter = this.audioContext.createBiquadFilter()

    noise.buffer = buffer
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(1000, this.audioContext.currentTime)

    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    const actualVolume = this.volume * volume * 0.4
    gainNode.gain.setValueAtTime(actualVolume, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    noise.start()
    noise.stop(this.audioContext.currentTime + duration)
  }

  // Game sounds
  shoot(weaponType = "pistol") {
    switch (weaponType) {
      case "shotgun":
        this.playNoise(0.15, 0.8)
        this.playTone(150, 0.1, "sawtooth", 0.6)
        break
      case "machineGun":
        this.playTone(800, 0.05, "square", 0.4)
        break
      case "rocket":
        this.playTone(100, 0.3, "sawtooth", 0.7)
        this.playNoise(0.2, 0.5)
        break
      case "laser":
        this.playTone(1200, 0.15, "sine", 0.5)
        this.playTone(800, 0.15, "sine", 0.3)
        break
      default:
        this.playTone(600, 0.08, "square", 0.5)
    }
  }

  hit() {
    this.playTone(200, 0.1, "sawtooth", 0.4)
  }

  explosion() {
    this.playNoise(0.4, 1)
    this.playTone(80, 0.3, "sawtooth", 0.8)
    this.playTone(60, 0.4, "sine", 0.6)
  }

  enemyDeath() {
    this.playTone(400, 0.1, "square", 0.3)
    this.playTone(200, 0.15, "square", 0.2)
  }

  playerHit() {
    this.playTone(150, 0.2, "sawtooth", 0.6)
    this.playNoise(0.1, 0.4)
  }

  levelUp() {
    setTimeout(() => this.playTone(523, 0.1, "sine", 0.5), 0)
    setTimeout(() => this.playTone(659, 0.15, "sine", 0.5), 100)
    setTimeout(() => this.playTone(784, 0.2, "sine", 0.6), 200)
  }

  powerUp() {
    this.playTone(440, 0.1, "sine", 0.4)
    setTimeout(() => this.playTone(660, 0.15, "sine", 0.5), 80)
  }

  reload() {
    this.playTone(300, 0.1, "square", 0.3)
    setTimeout(() => this.playTone(400, 0.1, "square", 0.4), 100)
  }

  dash() {
    this.playTone(200, 0.15, "sine", 0.3)
    this.playTone(400, 0.1, "sine", 0.2)
  }

  waveComplete() {
    setTimeout(() => this.playTone(392, 0.15, "sine", 0.4), 0)
    setTimeout(() => this.playTone(523, 0.15, "sine", 0.5), 150)
    setTimeout(() => this.playTone(659, 0.2, "sine", 0.6), 300)
  }

  combo(level: number) {
    const baseFreq = 400 + level * 50
    this.playTone(baseFreq, 0.1, "sine", 0.4)
    setTimeout(() => this.playTone(baseFreq * 1.25, 0.1, "sine", 0.5), 50)
  }

  grenade() {
    this.playTone(250, 0.1, "square", 0.4)
  }

  shieldActivate() {
    this.playTone(600, 0.2, "sine", 0.5)
    this.playTone(800, 0.3, "sine", 0.4)
  }

  shieldHit() {
    this.playTone(1000, 0.1, "sine", 0.3)
    this.playTone(1200, 0.05, "sine", 0.2)
  }

  purchase() {
    this.playTone(523, 0.1, "sine", 0.4)
    this.playTone(784, 0.15, "sine", 0.5)
  }

  error() {
    this.playTone(200, 0.2, "sawtooth", 0.4)
  }

  menuClick() {
    this.playTone(800, 0.05, "sine", 0.2)
  }

  gameOver() {
    setTimeout(() => this.playTone(400, 0.2, "sawtooth", 0.5), 0)
    setTimeout(() => this.playTone(300, 0.2, "sawtooth", 0.5), 200)
    setTimeout(() => this.playTone(200, 0.3, "sawtooth", 0.6), 400)
    setTimeout(() => this.playNoise(0.3, 0.4), 500)
  }
}

// Singleton instance
export const soundManager = new SoundManager()
