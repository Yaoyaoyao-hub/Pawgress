import type { FeedbackEventType } from '../types';

class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambient: OscillatorNode[] = [];
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.context) void this.context.suspend();
    if (enabled && this.context?.state === 'suspended') void this.context.resume();
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  startAmbient() {
    this.unlock();
    if (!this.context || !this.master || this.ambient.length) return;
    [110, 164.81].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.018 : 0.009;
      oscillator.connect(gain).connect(this.master!);
      oscillator.start();
      this.ambient.push(oscillator);
    });
  }

  duck(durationMs = 900) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(0.035, now + 0.03);
    this.master.gain.linearRampToValueAtTime(0.12, now + durationMs / 1000);
  }

  play(type: FeedbackEventType) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context || !this.master) return;
    const notes: Partial<Record<FeedbackEventType, number[]>> = {
      START: [392, 523.25],
      TARGET_REACHED: [659.25, 783.99],
      REP_COMPLETED: [523.25, 659.25, 783.99],
      SESSION_COMPLETED: [523.25, 659.25, 783.99, 1046.5],
      TRACKING_LOST: [293.66, 261.63],
      TRUNK_DEVIATION: [349.23],
    };
    (notes[type] ?? []).forEach((frequency, index) => this.tone(frequency, index * 0.09, type === 'SESSION_COMPLETED' ? 0.42 : 0.22));
  }

  private tone(frequency: number, delay: number, duration: number) {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.015, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.32, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

export const gameAudio = new GameAudio();
