import type { MotionMetrics, RepConfig } from '../types';

export type RepPhase = 'ready' | 'raising' | 'target' | 'lowering';

export interface RepState {
  phase: RepPhase;
  reps: number;
  targetEnteredAt: number | null;
  targetReached: boolean;
}

export interface RepUpdate {
  state: RepState;
  targetReachedNow: boolean;
  repCompletedNow: boolean;
}

export const initialRepState = (): RepState => ({
  phase: 'ready',
  reps: 0,
  targetEnteredAt: null,
  targetReached: false,
});

export function updateRepState(
  state: RepState,
  metrics: MotionMetrics,
  timestamp: number,
  config: RepConfig,
): RepUpdate {
  if (!metrics.trackingValid) return { state, targetReachedNow: false, repCompletedNow: false };
  let next = { ...state };
  let targetReachedNow = false;
  let repCompletedNow = false;

  if (state.phase === 'ready' && metrics.armAngle > config.resetAngle + 8) {
    next.phase = 'raising';
  }
  if ((state.phase === 'ready' || state.phase === 'raising') && metrics.armAngle >= config.targetAngle) {
    if (state.targetEnteredAt === null) next.targetEnteredAt = timestamp;
    const enteredAt = next.targetEnteredAt ?? timestamp;
    if (timestamp - enteredAt >= config.targetHoldMs) {
      next.phase = 'target';
      next.targetReached = true;
      targetReachedNow = !state.targetReached;
    }
  } else if (state.phase !== 'target' && metrics.armAngle < config.targetAngle - 4) {
    next.targetEnteredAt = null;
  }
  if (state.phase === 'target' && metrics.armAngle < config.targetAngle - 10) {
    next.phase = 'lowering';
  }
  if (state.phase === 'lowering' && metrics.armAngle <= config.resetAngle) {
    next = {
      phase: 'ready',
      reps: state.reps + 1,
      targetEnteredAt: null,
      targetReached: false,
    };
    repCompletedNow = true;
  }

  return { state: next, targetReachedNow, repCompletedNow };
}
