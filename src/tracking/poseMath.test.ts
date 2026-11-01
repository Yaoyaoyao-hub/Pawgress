import { describe, expect, it } from 'vitest';
import type { Landmark } from '../types';
import { POSE, angleBetween, calculateMotionMetrics, trunkLeanDegrees } from './poseMath';

const point = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });
const pose = (): Landmark[] => Array.from({ length: 33 }, () => point(0.5, 0.5));

describe('pose math', () => {
  it('calculates a right angle', () => {
    expect(angleBetween(point(1, 0), point(0, 0), point(0, 1))).toBeCloseTo(90);
  });

  it('returns invalid metrics for missing landmarks', () => {
    expect(calculateMotionMetrics([], 0.5).trackingValid).toBe(false);
  });

  it('measures trunk lean from shoulder and hip midpoints', () => {
    const landmarks = pose();
    landmarks[POSE.leftShoulder] = point(0.6, 0.2);
    landmarks[POSE.rightShoulder] = point(0.6, 0.2);
    landmarks[POSE.leftHip] = point(0.5, 0.6);
    landmarks[POSE.rightHip] = point(0.5, 0.6);
    expect(trunkLeanDegrees(landmarks)).toBeCloseTo(14.04, 1);
  });

  it('selects the more visible side', () => {
    const landmarks = pose();
    landmarks[POSE.leftShoulder] = point(0.5, 0.3, 0.2);
    landmarks[POSE.leftElbow] = point(0.4, 0.3, 0.2);
    landmarks[POSE.leftHip] = point(0.5, 0.7, 0.2);
    landmarks[POSE.rightShoulder] = point(0.5, 0.3);
    landmarks[POSE.rightElbow] = point(0.7, 0.3);
    landmarks[POSE.rightHip] = point(0.5, 0.7);
    expect(calculateMotionMetrics(landmarks)).toMatchObject({ side: 'right', trackingValid: true });
  });
});
