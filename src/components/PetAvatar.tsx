import type { PetAsset } from '../types';

interface PetAvatarProps {
  pet: PetAsset;
  size?: 'sm' | 'md' | 'lg';
  celebrating?: boolean;
  className?: string;
}

const sizes = { sm: 64, md: 96, lg: 144 };

export function PetAvatar({ pet, size = 'md', celebrating = false, className = '' }: PetAvatarProps) {
  const px = sizes[size];
  if (pet.imageUrl) {
    return (
      <div
        className={`pet-avatar relative overflow-hidden rounded-[42%] border-4 border-white bg-[#d9f4ff] shadow-lg ${celebrating ? 'pet-celebrate' : ''} ${className}`}
        style={{ width: px, height: px }}
        role="img"
        aria-label={`${pet.name}, your exercise buddy`}
      >
        <img src={pet.imageUrl} alt="" className="h-full w-full object-cover" />
        <span className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#35435f]/20 to-transparent" />
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 160 160"
      width={px}
      height={px}
      className={`pet-avatar drop-shadow-xl ${celebrating ? 'pet-celebrate' : ''} ${className}`}
      role="img"
      aria-label="Mochi the bundled demo pet"
    >
      <ellipse cx="80" cy="143" rx="47" ry="10" fill="#80a9c9" opacity=".2" />
      <path d="M39 59 34 25l30 23M121 59l5-34-31 23" fill="#f8ab96" stroke="#fff" strokeWidth="7" strokeLinejoin="round" />
      <path d="M48 46 41 35l17 13M112 46l8-11-18 13" fill="#ffd2c7" />
      <path d="M42 119c0-27 15-42 38-42s38 15 38 42v22H42z" fill="#f8ab96" stroke="#fff" strokeWidth="7" />
      <circle cx="80" cy="72" r="44" fill="#f8ab96" stroke="#fff" strokeWidth="7" />
      <path d="M61 69c4-6 9-6 13 0M87 69c4-6 9-6 13 0" fill="none" stroke="#35435f" strokeWidth="5" strokeLinecap="round" />
      <path d="m76 81 4 4 4-4" fill="#ef7f7f" stroke="#35435f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M80 85v6m-13 0c6 7 19 7 26 0" fill="none" stroke="#35435f" strokeWidth="3" strokeLinecap="round" />
      <path d="M47 103c-11 8-18 21-11 31 7 9 18 2 18-7" fill="none" stroke="#f8ab96" strokeWidth="13" strokeLinecap="round" />
      <path d="M59 119h42" stroke="#fff" strokeWidth="13" strokeLinecap="round" opacity=".7" />
      <path d="m62 105 18 13 18-13" fill="#75c6cb" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="80" cy="119" r="7" fill="#ffd66e" />
    </svg>
  );
}
