import { describe, expect, it } from 'vitest';
import type { RecordedFrame } from '../types';
import { ghostTrailAtProgress, movementProgress, segmentRepetitions, selectBestGhost } from './ghost';

const frame = (timestamp: number, armAngle: number, trunkLean = 2): RecordedFrame => ({
  timestamp,
  landmarks: Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 })),
  metrics: { armAngle, trunkLean, confidence: 1, trackingValid: true, side: 'left' },
});

describe('ghost reference', () => {
  const recording = [20, 45, 70, 90, 92, 65, 40, 20].map((angle, index) => frame(index * 100, angle));

  it('segments and time-normalizes a complete repetition', () => {
    const references = segmentRepetitions(recording, 85);
    expect(references).toHaveLength(1);
    expect(references[0].frames[0].progress).toBe(0);
    expect(references[0].frames.at(-1)?.progress).toBe(1);
  });

  it('maps live rep phases into normalized progress', () => {
    expect(movementProgress('raising', 57.5, 85, 30)).toBeCloseTo(0.25);
    expect(movementProgress('target', 90, 85, 30)).toBe(0.5);
    expect(movementProgress('lowering', 30, 85, 30)).toBe(1);
  });

  it('selects a best reference and returns a fading trail window', () => {
    const weaker = recording.map((item) => ({ ...item, metrics: { ...item.metrics, trunkLean: 10 } }));
    const best = selectBestGhost([weaker, recording], 85);
    expect(best?.score).toBeGreaterThan(80);
    expect(ghostTrailAtProgress(best, 0.7)).not.toHaveLength(0);
  });
});
