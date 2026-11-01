export type AppStep = 'welcome' | 'pet' | 'calibrate' | 'game' | 'summary';
export type InputMode = 'camera' | 'demo';
export type FeedbackEventType =
  | 'START'
  | 'TARGET_REACHED'
  | 'TRUNK_DEVIATION'
  | 'TRACKING_LOST'
  | 'REP_COMPLETED'
  | 'SESSION_COMPLETED';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

export interface PoseFrame {
  timestamp: number;
  landmarks: Landmark[];
}

export interface MotionMetrics {
  armAngle: number;
  trunkLean: number;
  confidence: number;
  trackingValid: boolean;
  side: 'left' | 'right';
}

export interface RecordedFrame {
  timestamp: number;
  landmarks: Landmark[];
  metrics: MotionMetrics;
}

export interface FeedbackEvent {
  id: string;
  type: FeedbackEventType;
  timestamp: number;
  message: string;
  rep?: number;
  metrics?: Partial<MotionMetrics>;
}

export interface PetAsset {
  name: string;
  imageUrl?: string;
  kind: 'demo' | 'upload';
}

export interface SessionSummary {
  id: string;
  completedAt: string;
  reps: number;
  peakArmAngle: number;
  maxTrunkLean: number;
  mode: InputMode;
  petName: string;
  durationSeconds: number;
  targetAngle?: number;
  biome?: string;
  recording: RecordedFrame[];
}

export interface RepConfig {
  targetAngle: number;
  resetAngle: number;
  trunkLimit: number;
  targetHoldMs: number;
  trackingConfidence: number;
}
