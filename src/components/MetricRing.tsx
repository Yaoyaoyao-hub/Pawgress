export function MetricRing({ value, max, label, suffix = '°', tone = 'mint' }: { value: number; max: number; label: string; suffix?: string; tone?: 'mint' | 'coral' }) {
  const progress = Math.min(100, Math.max(0, (value / max) * 100));
  const color = tone === 'mint' ? '#68c7c9' : '#ef8c8c';
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3">
      <div className="relative grid h-14 w-14 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${progress}%, #e3edf2 ${progress}%)` }}>
        <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-black text-[#35435f]">{Math.round(value)}{suffix}</div>
      </div>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[.12em] text-[#8a9bad]">{label}</p>
        <p className="text-xs font-semibold text-[#58697f]">{tone === 'mint' ? 'Estimated' : 'Movement'}</p>
      </div>
    </div>
  );
}
