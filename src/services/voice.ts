import type { FeedbackEvent } from '../types';

class VoiceCoach {
  private queue: string[] = [];
  private speaking = false;
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.queue = [];
      window.speechSynthesis?.cancel();
      this.speaking = false;
    }
  }

  speak(event: FeedbackEvent) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    if (this.queue[this.queue.length - 1] === event.message) return;
    this.queue.push(event.message);
    this.playNext();
  }

  private playNext() {
    if (this.speaking || this.queue.length === 0) return;
    const message = this.queue.shift();
    if (!message) return;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.04;
    utterance.pitch = 1.12;
    utterance.volume = 0.85;
    this.speaking = true;
    utterance.onend = utterance.onerror = () => {
      this.speaking = false;
      this.playNext();
    };
    window.speechSynthesis.speak(utterance);
  }
}

export const voiceCoach = new VoiceCoach();
