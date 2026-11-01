export interface RitualStop {
  id: 'cafe' | 'lantern-garden' | 'studio-bridge' | 'sunroom-lookout';
  name: string;
  shortName: string;
  icon: string;
  color: string;
}

export const RITUAL_STOPS: RitualStop[] = [
  { id: 'cafe', name: 'Pawgress Café', shortName: 'Café', icon: '☕', color: '#ef9a7e' },
  { id: 'lantern-garden', name: 'Lantern Garden', shortName: 'Garden', icon: '✦', color: '#f1bd63' },
  { id: 'studio-bridge', name: 'Studio Bridge', shortName: 'Bridge', icon: '♫', color: '#76b7ad' },
  { id: 'sunroom-lookout', name: 'Sunroom Lookout', shortName: 'Lookout', icon: '☀', color: '#ee8d83' },
];

export function ritualStopForRep(rep: number): RitualStop {
  const index = Math.max(0, Math.min(RITUAL_STOPS.length - 1, Math.round(rep)));
  return RITUAL_STOPS[index];
}

export function nextRitualStop(reps: number): RitualStop {
  return ritualStopForRep(Math.min(3, reps + 1));
}

export function ritualRoutePoint(progress: number) {
  const bounded = Math.max(0, Math.min(3, progress));
  const t = bounded / 3;
  return {
    x: 0.12 + t * 0.76,
    y: 0.74 - Math.sin(t * Math.PI) * 0.27 + t * 0.015,
    scale: 1 - Math.sin(t * Math.PI) * 0.18,
  };
}
