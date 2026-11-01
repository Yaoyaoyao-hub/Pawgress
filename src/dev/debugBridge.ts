import type { RepPhase } from '../game/repMachine';
import type { ExpeditionState } from '../simulation/expedition';
import type { AppStep, MotionMetrics } from '../types';

export type PawgressScene = 'ready' | 'raising' | 'target-hold' | 'tracking-lost' | 'trunk-feedback' | 'final-leap';

export interface PawgressDebugState {
  step: AppStep;
  reps: number;
  phase: RepPhase;
  metrics: MotionMetrics;
  expedition: ExpeditionState | null;
  canvasPerformance: { fps: number; averageFrameMs: number; p95FrameMs: number; particleCount: number };
  trackerPerformance: { inferenceMs: number; droppedFrames: number; sampledFrames: number };
}

export interface PawgressDebugBridge {
  getState: () => PawgressDebugState;
  setDemoPose: (armAngle: number, trunkLean?: number) => void;
  completeRep: () => void;
  loadScene: (scene: PawgressScene) => void;
}

declare global {
  interface Window {
    __PAWGRESS__?: PawgressDebugBridge;
  }
}

export function installDebugBridge(bridge: PawgressDebugBridge) {
  if (!import.meta.env.DEV) return () => undefined;
  window.__PAWGRESS__ = bridge;
  return () => {
    delete window.__PAWGRESS__;
  };
}
