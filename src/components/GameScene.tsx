import { Sparkles } from 'lucide-react';
import type { PetAsset } from '../types';
import { PetAvatar } from './PetAvatar';

export function GameScene({ pet, reps, completed }: { pet: PetAsset; reps: number; completed: boolean }) {
  const positions = ['8%', '31%', '55%', '79%'];
  return (
    <div className="game-scene relative min-h-[330px] overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-b from-[#dff7ff] via-[#edfaff] to-[#8ad5e4] shadow-[0_20px_60px_rgba(55,120,159,.16)]">
      <div className="absolute left-[8%] top-8 h-14 w-14 rounded-full bg-[#fff7c4] shadow-[0_0_50px_#fff4a8]" />
      <div className="cloud cloud-one" />
      <div className="cloud cloud-two" />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-b from-[#73c8db] to-[#5498c1]">
        <div className="water-lines" />
      </div>

      {[0, 1, 2].map((platform) => (
        <div
          key={platform}
          className={`ice-platform absolute bottom-[19%] h-11 w-[18%] rounded-[50%] border-t-4 border-white bg-[#c8f4ff] shadow-[0_9px_0_#72bdd0,0_18px_25px_rgba(46,102,145,.25)] ${reps > platform ? 'platform-won' : ''}`}
          style={{ left: `${19 + platform * 23}%` }}
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[70%] text-2xl">{reps > platform ? '⭐' : '✦'}</span>
        </div>
      ))}

      <div className="absolute bottom-[14%] right-[-2%] h-[34%] w-[24%] rounded-[55%_0_0_35%] border-t-[10px] border-white bg-[#bceebc] shadow-[inset_0_-22px_0_#8bc99b]">
        <span className="absolute left-[26%] top-[-28px] text-5xl">🏁</span>
        <span className="absolute left-[32%] top-7 text-3xl">🌲</span>
      </div>

      <div
        className="absolute bottom-[24%] z-20 transition-[left] duration-700 ease-[cubic-bezier(.22,1.4,.36,1)]"
        style={{ left: positions[Math.min(reps, 3)] }}
      >
        <PetAvatar pet={pet} size="sm" celebrating={completed} />
      </div>

      {[0, 1, 2].map((star) => (
        <div key={star} className={`reward-star absolute top-7 z-20 ${reps > star ? 'star-earned' : ''}`} style={{ right: `${17 + star * 9}%`, animationDelay: `${star * 120}ms` }}>
          ★
        </div>
      ))}

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
