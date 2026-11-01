import type { Landmark } from '../types';
import { POSE } from '../tracking/poseMath';

const connections: [number, number][] = [
  [POSE.leftShoulder, POSE.rightShoulder],
  [POSE.leftShoulder, POSE.leftElbow],
  [POSE.rightShoulder, POSE.rightElbow],
  [POSE.leftShoulder, POSE.leftHip],
  [POSE.rightShoulder, POSE.rightHip],
  [POSE.leftHip, POSE.rightHip],
];

export function PoseOverlay({ landmarks, ghost = false }: { landmarks: Landmark[]; ghost?: boolean }) {
  if (landmarks.length === 0) return null;
  const visible = new Set(connections.flat());
  return (
    <svg className={`absolute inset-0 h-full w-full -scale-x-100 ${ghost ? 'opacity-30' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {connections.map(([from, to]) => {
        const a = landmarks[from];
        const b = landmarks[to];
        if (!a || !b) return null;
        return <line key={`${from}-${to}`} x1={a.x * 100} y1={a.y * 100} x2={b.x * 100} y2={b.y * 100} stroke={ghost ? '#fff' : '#9cffd8'} strokeWidth="1.4" strokeLinecap="round" />;
      })}
      {[...visible].map((index) => {
        const point = landmarks[index];
        return point ? <circle key={index} cx={point.x * 100} cy={point.y * 100} r="1.5" fill={ghost ? '#fff' : '#ffe36d'} /> : null;
      })}
    </svg>
  );
}
