import type { Landmark, MotionMetrics } from '../types';

export const POSE = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftHip: 23,
  rightHip: 24,
} as const;

const degrees = (radians: number) => (radians * 180) / Math.PI;

export function angleBetween(a: Landmark, vertex: Landmark, b: Landmark): number {
  const av = { x: a.x - vertex.x, y: a.y - vertex.y };
  const bv = { x: b.x - vertex.x, y: b.y - vertex.y };
  const aLength = Math.hypot(av.x, av.y);
  const bLength = Math.hypot(bv.x, bv.y);
  if (aLength === 0 || bLength === 0) return 0;
  const cosine = Math.max(-1, Math.min(1, (av.x * bv.x + av.y * bv.y) / (aLength * bLength)));
  return degrees(Math.acos(cosine));
}

export function trunkLeanDegrees(landmarks: Landmark[]): number {
  const ls = landmarks[POSE.leftShoulder];
  const rs = landmarks[POSE.rightShoulder];
  const lh = landmarks[POSE.leftHip];
  const rh = landmarks[POSE.rightHip];
  if (![ls, rs, lh, rh].every(Boolean)) return 0;
  const shoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const hip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  return Math.abs(degrees(Math.atan2(shoulder.x - hip.x, hip.y - shoulder.y)));
}

function landmarkConfidence(point: Landmark | undefined): number {
  if (!point) return 0;
  return Math.min(point.visibility ?? 1, point.presence ?? 1);
}

export function calculateMotionMetrics(
  landmarks: Landmark[],
  minimumConfidence = 0.55,
): MotionMetrics {
  const leftPoints = [landmarks[POSE.leftShoulder], landmarks[POSE.leftElbow], landmarks[POSE.leftHip]];
  const rightPoints = [landmarks[POSE.rightShoulder], landmarks[POSE.rightElbow], landmarks[POSE.rightHip]];
  const leftConfidence = Math.min(...leftPoints.map(landmarkConfidence));
  const rightConfidence = Math.min(...rightPoints.map(landmarkConfidence));
  const side = leftConfidence >= rightConfidence ? 'left' : 'right';
  const points = side === 'left' ? leftPoints : rightPoints;
  const confidence = Math.max(leftConfidence, rightConfidence);
  const trackingValid = points.every(Boolean) && confidence >= minimumConfidence;
  return {
    armAngle: trackingValid ? angleBetween(points[1], points[0], points[2]) : 0,
    trunkLean: trackingValid ? trunkLeanDegrees(landmarks) : 0,
    confidence,
    trackingValid,
    side,
  };
}

export function smoothMetrics(previous: MotionMetrics | null, next: MotionMetrics, alpha = 0.22): MotionMetrics {
  if (!previous || !next.trackingValid) return next;
  return {
    ...next,
    armAngle: previous.armAngle + alpha * (next.armAngle - previous.armAngle),
    trunkLean: previous.trunkLean + alpha * (next.trunkLean - previous.trunkLean),
  };
}
