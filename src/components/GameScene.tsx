import { Sparkles } from 'lucide-react';
import type { RepPhase } from '../game/repMachine';
import { type ExpeditionState } from '../simulation/expedition';
import { nextRitualStop, RITUAL_STOPS } from '../simulation/ritual';
import type { PetAsset } from '../types';
import { RitualCanvas, type CanvasPerformance } from './RitualCanvas';

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
  const destination = nextRitualStop(reps);
  return (
    <div className="game-scene relative min-h-[390px] overflow-hidden rounded-[2rem] border border-white/80 bg-[#e9f1df] shadow-[0_20px_60px_rgba(77,101,84,.16)]">
      <RitualCanvas pet={pet} reps={reps} completed={completed} phase={phase} armAngle={armAngle} targetAngle={targetAngle} seed={seed} onPerformance={onPerformance} onState={onState} />

      <div className="absolute right-4 top-4 z-20 hidden w-48 rounded-2xl border border-white/80 bg-[#fffdf5]/88 p-3 shadow-lg backdrop-blur sm:block">
        <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#8a7d68]">Warmth route · {reps}/3</p>
        <p className="mt-1 text-sm font-black text-[#4b5d55]">Next: {destination.name}</p>
        <div className="mt-2 flex gap-1.5">
          {RITUAL_STOPS.slice(1).map((stop, index) => (
            <span key={stop.id} className={`h-2 flex-1 rounded-full ${reps > index ? 'bg-[#eeb969]' : reps === index ? 'bg-[#79aaa0]' : 'bg-[#dce4dc]'}`} />
          ))}
        </div>
      </div>

      {completed && (
        <div className="celebration absolute inset-0 z-30 grid place-items-center bg-white/10 backdrop-blur-[1px]">
          <div className="rounded-full bg-white/90 px-7 py-4 text-center shadow-xl">
            <Sparkles className="mx-auto mb-1 text-[#ffb74f]" />
            <p className="font-display text-2xl font-black text-[#34445f]">The village is glowing!</p>
          </div>
        </div>
      )}
    </div>
  );
}
