export class SynthSfx {
  constructor(scene) {
    this.scene = scene;
    this.audioContext = scene.sound?.context ?? null;
  }

  unlock() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  play(name) {
    if (!this.audioContext || this.audioContext.state !== 'running') {
      return;
    }

    const presets = {
      bumper: { frequency: 440, type: 'square', duration: 0.08, volume: 0.035 },
      target: { frequency: 620, type: 'triangle', duration: 0.09, volume: 0.03 },
      launch: { frequency: 180, type: 'sawtooth', duration: 0.12, volume: 0.045 },
      mission: { frequency: 740, type: 'triangle', duration: 0.18, volume: 0.05 },
      drain: { frequency: 130, type: 'sine', duration: 0.22, volume: 0.04 },
      flipper: { frequency: 280, type: 'square', duration: 0.04, volume: 0.02 },
    };

    const preset = presets[name];

    if (!preset) {
      return;
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(50, preset.frequency * 0.72), now + preset.duration);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(preset.volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.duration + 0.02);
  }
}