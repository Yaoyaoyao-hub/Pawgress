import type { FeedbackEvent, FeedbackEventType, MotionMetrics } from '../types';

const messages: Record<FeedbackEventType, string> = {
  START: 'Adventure started. Move in a way that feels comfortable.',
  TARGET_REACHED: 'Beautiful reach! Now lower gently.',
  TRUNK_DEVIATION: 'Try keeping your body tall and steady.',
  TRACKING_LOST: 'I lost sight of you. Step back into the frame.',
  REP_COMPLETED: 'Nice work! One ice hop closer.',
  SESSION_COMPLETED: 'You made it to the island. Great teamwork!',
};

export function makeFeedbackEvent(
  type: FeedbackEventType,
  timestamp: number,
  options: { rep?: number; metrics?: Partial<MotionMetrics>; message?: string } = {},
): FeedbackEvent {
  return {
    id: `${type}-${timestamp}-${options.rep ?? 0}`,
    type,
    timestamp,
    message: options.message ?? messages[type],
    rep: options.rep,
    metrics: options.metrics,
  };
}

export class FeedbackGate {
  private lastByType = new Map<FeedbackEventType, number>();

  allow(type: FeedbackEventType, timestamp: number, cooldownMs = 2500): boolean {
    const previous = this.lastByType.get(type) ?? -Infinity;
    if (timestamp - previous < cooldownMs) return false;
    this.lastByType.set(type, timestamp);
    return true;
  }

  reset() {
    this.lastByType.clear();
  }
}
