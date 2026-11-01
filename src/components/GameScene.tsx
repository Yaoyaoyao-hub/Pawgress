import { Sparkles } from 'lucide-react';
import type { RepPhase } from '../game/repMachine';
import { type ExpeditionState } from '../simulation/expedition';
import type { PetAsset } from '../types';
import { ArcticCanvas, type CanvasPerformance } from './ArcticCanvas';

interface GameSceneProps {
  pet: PetAsset;
  reps: number;
  completed: boolean;
  phase: RepPhase;
  armAngle: number;
  targetAngle: number;
  seed: number;
  onPerformance?: (performance: CanvasPerformance) => void;
  onState?: (state: ExpeditionState) => void;
}

export function GameScene({ pet, reps, completed, phase, armAngle, targetAngle, seed, onPerformance, onState }: GameSceneProps) {
  return (
    <div className="game-scene relative min-h-[330px] overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-b from-[#dff7ff] via-[#edfaff] to-[#8ad5e4] shadow-[0_20px_60px_rgba(55,120,159,.16)]">
      <ArcticCanvas pet={pet} reps={reps} completed={completed} phase={phase} armAngle={armAngle} targetAngle={targetAngle} seed={seed} onPerformance={onPerformance} onState={onState} />

      {completed && (
        <div className="celebration absolute inset-0 z-30 grid place-items-center bg-white/10 backdrop-blur-[1px]">
          <div className="rounded-full bg-white/90 px-7 py-4 text-center shadow-xl">
            <Sparkles className="mx-auto mb-1 text-[#ffb74f]" />
            <p className="font-display text-2xl font-black text-[#34445f]">Island reached!</p>
          </div>
        </div>
      )}
    </div>
  );
}
