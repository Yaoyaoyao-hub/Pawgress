import { describe, expect, it } from 'vitest';
import { FeedbackGate, makeFeedbackEvent } from './feedback';

describe('feedback events', () => {
  it('creates a stable typed event payload', () => {
    const event = makeFeedbackEvent('REP_COMPLETED', 1000, { rep: 2 });
    expect(event).toMatchObject({
      id: 'REP_COMPLETED-1000-2',
      type: 'REP_COMPLETED',
      rep: 2,
    });
  });

  it('deduplicates repeated feedback during a cooldown', () => {
    const gate = new FeedbackGate();
    expect(gate.allow('TRACKING_LOST', 1000, 2500)).toBe(true);
    expect(gate.allow('TRACKING_LOST', 2000, 2500)).toBe(false);
    expect(gate.allow('TRACKING_LOST', 3500, 2500)).toBe(true);
  });

  it('tracks independent event types separately', () => {
    const gate = new FeedbackGate();
    expect(gate.allow('TRACKING_LOST', 1000)).toBe(true);
    expect(gate.allow('TRUNK_DEVIATION', 1000)).toBe(true);
  });
});
