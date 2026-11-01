import type { RepPhase } from '../game/repMachine';
import type { RecordedFrame } from '../types';

export interface NormalizedGhostFrame {
  progress: number;
  frame: RecordedFrame;
}

export interface GhostReference {
  frames: NormalizedGhostFrame[];
  score: number;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function movementProgress(
  phase: RepPhase,
  armAngle: number,
  targetAngle: number,
  resetAngle: number,
): number {
  const raised = clamp((armAngle - resetAngle) / Math.max(1, targetAngle - resetAngle));
  if (phase === 'ready') return 0;
  if (phase === 'raising') return raised * 0.5;
  if (phase === 'target') return 0.5;
  return 0.5 + (1 - raised) * 0.5;
}

export function segmentRepetitions(
  recording: RecordedFrame[],
  targetAngle: number,
  resetAngle = 30,
): GhostReference[] {
  const segments: RecordedFrame[][] = [];
  let active: RecordedFrame[] | null = null;
  let reachedTarget = false;

  recording.forEach((frame) => {
    if (!frame.metrics.trackingValid || frame.landmarks.length === 0) return;
    if (!active && frame.metrics.armAngle > resetAngle + 8) active = [frame];
    else if (active) active.push(frame);
    if (active && frame.metrics.armAngle >= targetAngle) reachedTarget = true;
    if (active && reachedTarget && frame.metrics.armAngle <= resetAngle) {
      if (active.length >= 4) segments.push(active);
      active = null;
      reachedTarget = false;
    }
  });

  return segments.map((frames) => {
    let peakIndex = 0;
    frames.forEach((frame, index) => {
      if (frame.metrics.armAngle > frames[peakIndex].metrics.armAngle) peakIndex = index;
    });
    const normalized = frames.map((frame, index) => ({
      frame,
      progress: index <= peakIndex
        ? 0.5 * (index / Math.max(1, peakIndex))
        : 0.5 + 0.5 * ((index - peakIndex) / Math.max(1, frames.length - 1 - peakIndex)),
    }));
    const peak = frames[peakIndex].metrics.armAngle;
    const averageTrunk = frames.reduce((sum, frame) => sum + frame.metrics.trunkLean, 0) / frames.length;
    return { frames: normalized, score: peak - averageTrunk * 1.5 };
  });
}

export function selectBestGhost(
  recordings: RecordedFrame[][],
  targetAngle: number,
  resetAngle = 30,
): GhostReference | null {
  const references = recordings.flatMap((recording) => segmentRepetitions(recording, targetAngle, resetAngle));
  return references.reduce<GhostReference | null>((best, reference) => (!best || reference.score > best.score ? reference : best), null);
}

export function ghostTrailAtProgress(reference: GhostReference | null, progress: number, length = 4): RecordedFrame[] {
  if (!reference?.frames.length) return [];
  let closest = 0;
  reference.frames.forEach((item, index) => {
    if (Math.abs(item.progress - progress) < Math.abs(reference.frames[closest].progress - progress)) closest = index;
  });
  const result: RecordedFrame[] = [];
  for (let index = Math.max(0, closest - (length - 1) * 2); index <= closest; index += 2) {
    result.push(reference.frames[index].frame);
  }
  return result;
}
