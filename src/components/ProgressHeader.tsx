import { Volume2, VolumeX } from 'lucide-react';

const labels = ['Buddy', 'Ready', 'Play', 'Done'];

export function ProgressHeader({ stage, muted, onMute }: { stage: number; muted: boolean; onMute: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <button className="flex items-center gap-2" onClick={() => window.location.reload()} aria-label="Restart Pawgress">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ef8c8c] text-xl shadow-sm">🐾</span>
        <span className="font-display text-xl font-black tracking-tight text-[#35435f]">Pawgress</span>
      </button>
      <nav className="hidden items-center gap-2 rounded-full border border-white/80 bg-white/60 px-3 py-2 shadow-sm backdrop-blur sm:flex" aria-label="Progress">
        {labels.map((label, index) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${index <= stage ? 'bg-[#68c7c9] text-white' : 'bg-[#dfe9ef] text-[#8a9bad]'}`}>
              {index < stage ? '✓' : index + 1}
            </span>
            <span className={`text-xs font-bold ${index <= stage ? 'text-[#45566f]' : 'text-[#9aabba]'}`}>{label}</span>
            {index < labels.length - 1 && <span className="h-px w-4 bg-[#cedde5]" />}
          </div>
        ))}
      </nav>
      <button onClick={onMute} className="icon-button" aria-label={muted ? 'Turn voice on' : 'Mute voice'}>
        {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
      </button>
    </header>
  );
}
