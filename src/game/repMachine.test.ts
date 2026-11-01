import { describe, expect, it } from 'vitest';
import type { MotionMetrics, RepConfig } from '../types';
import { initialRepState, updateRepState } from './repMachine';

const config: RepConfig = {
  targetAngle: 80,
  resetAngle: 30,
  trunkLimit: 12,
  targetHoldMs: 100,
  trackingConfidence: 0.55,
};
const metrics = (armAngle: number, trackingValid = true): MotionMetrics => ({
  armAngle,
  trunkLean: 0,
  confidence: trackingValid ? 1 : 0,
  trackingValid,
  side: 'left',
});

describe('rep state machine', () => {
  it('requires target hold and a full return before rewarding', () => {
    let state = initialRepState();
    state = updateRepState(state, metrics(50), 0, config).state;
    state = updateRepState(state, metrics(90), 10, config).state;
    expect(state.phase).toBe('raising');
    const target = updateRepState(state, metrics(90), 120, config);
    expect(target.targetReachedNow).toBe(true);
    state = target.state;
    state = updateRepState(state, metrics(60), 140, config).state;
    const completed = updateRepState(state, metrics(20), 180, config);
    expect(completed.repCompletedNow).toBe(true);
    expect(completed.state.reps).toBe(1);
  });

  it('rewards exactly once while remaining below reset', () => {
    let state = initialRepState();
    for (const [angle, time] of [[50, 0], [90, 10], [90, 120], [60, 140]] as const) {
      state = updateRepState(state, metrics(angle), time, config).state;
    }
    const first = updateRepState(state, metrics(20), 180, config);
    const second = updateRepState(first.state, metrics(20), 220, config);
    expect(first.repCompletedNow).toBe(true);
    expect(second.repCompletedNow).toBe(false);
    expect(second.state.reps).toBe(1);
  });

  it('ignores invalid tracking frames', () => {
    const state = initialRepState();
    expect(updateRepState(state, metrics(100, false), 1000, config).state).toEqual(state);
  });
});
