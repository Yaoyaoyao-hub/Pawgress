import type { RepPhase } from '../game/repMachine';

export type PetMotion = 'idle' | 'anticipate' | 'charge' | 'leap' | 'land' | 'celebrate';
export type ParticleKind = 'snow' | 'spark' | 'star';

export interface Biome {
  id: 'aurora-bay' | 'crystal-floes' | 'seal-cove' | 'moonlit-glacier';
  name: string;
  skyTop: string;
  skyBottom: string;
  waterTop: string;
  waterBottom: string;
  aurora: string[];
  accent: string;
  landmark: 'pines' | 'crystals' | 'seal' | 'moon';
}

export interface ExpeditionInput {
  reps: number;
  phase: RepPhase;
  armAngle: number;
  targetAngle: number;
  completed: boolean;
}

export interface ExpeditionParticle {
  id: number;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface ExpeditionRipple {
  id: number;
  x: number;
  age: number;
}

export interface ExpeditionState {
  seed: number;
  randomState: number;
  time: number;
  petProgress: number;
  petMotion: PetMotion;
  charge: number;
  landingPulse: number;
  lastReps: number;
  nextId: number;
  spawnAccumulator: number;
  platformSprings: Array<{ offset: number; velocity: number }>;
  particles: ExpeditionParticle[];
  ripples: ExpeditionRipple[];
  biome: Biome;
}

export const BIOMES: Biome[] = [
  {
    id: 'aurora-bay',
    name: 'Lantern Bay',
    skyTop: '#bcebf3',
    skyBottom: '#f3fbff',
    waterTop: '#62bfd3',
    waterBottom: '#3b82ad',
    aurora: ['#7ce4c6', '#a8e5ff', '#e9b7ef'],
    accent: '#ffd978',
    landmark: 'pines',
  },
  {
    id: 'crystal-floes',
    name: 'Glassgarden',
    skyTop: '#cabff2',
    skyBottom: '#eef7ff',
    waterTop: '#79a9d9',
    waterBottom: '#536da7',
    aurora: ['#b0f2ff', '#d8bdff', '#8ee7db'],
    accent: '#a9f1ff',
    landmark: 'crystals',
  },
  {
    id: 'seal-cove',
    name: 'Clover Cove',
    skyTop: '#ffd9ce',
    skyBottom: '#f4fbff',
    waterTop: '#77c9cf',
    waterBottom: '#438fa5',
    aurora: ['#a2edcd', '#f6d59e', '#b8e8ff'],
    accent: '#ffbf8d',
    landmark: 'seal',
  },
  {
    id: 'moonlit-glacier',
    name: 'Moonrise Quarter',
    skyTop: '#374d79',
    skyBottom: '#a7cfe4',
    waterTop: '#4f82a7',
    waterBottom: '#284b72',
    aurora: ['#6ef2d0', '#84b9ff', '#df97ee'],
    accent: '#fff0a5',
    landmark: 'moon',
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function nextRandom(state: number): [number, number] {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}

function seedSnow(seed: number): { particles: ExpeditionParticle[]; randomState: number; nextId: number } {
  let randomState = seed || 1;
  const particles: ExpeditionParticle[] = [];
  for (let index = 0; index < 34; index += 1) {
    let random: number;
    [random, randomState] = nextRandom(randomState);
    const x = random;
    [random, randomState] = nextRandom(randomState);
    const y = random;
    [random, randomState] = nextRandom(randomState);
    particles.push({
      id: index,
      kind: 'snow',
      x,
      y,
      vx: 0.006 + random * 0.012,
      vy: 0.018 + random * 0.026,
      life: Infinity,
      maxLife: Infinity,
      size: 1.5 + random * 2.8,
    });
  }
  return { particles, randomState, nextId: particles.length };
}

export function biomeForSeed(seed: number): Biome {
  return BIOMES[Math.abs(seed) % BIOMES.length];
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createExpedition(seed: number): ExpeditionState {
  const snow = seedSnow(seed);
  return {
    seed,
    randomState: snow.randomState,
    time: 0,
    petProgress: 0,
    petMotion: 'idle',
    charge: 0,
    landingPulse: 0,
    lastReps: 0,
    nextId: snow.nextId,
    spawnAccumulator: 0,
    platformSprings: Array.from({ length: 3 }, () => ({ offset: 0, velocity: 0 })),
    particles: snow.particles,
    ripples: [],
    biome: biomeForSeed(seed),
  };
}

export function progressPosition(progress: number): number {
  const stops = [0.12, 0.35, 0.58, 0.84];
  const bounded = clamp(progress, 0, 3);
  const from = Math.min(2, Math.floor(bounded));
  const fraction = bounded - from;
  const eased = fraction * fraction * (3 - 2 * fraction);
  return stops[from] + (stops[from + 1] - stops[from]) * eased;
}

export function waterHeight(x: number, time: number): number {
  return Math.sin(time * 1.25 + x * 11) * 0.004 + Math.sin(time * 0.7 - x * 18) * 0.0025;
}

function emitBurst(
  state: ExpeditionState,
  particles: ExpeditionParticle[],
  kind: 'spark' | 'star',
  x: number,
  y: number,
  count: number,
): Pick<ExpeditionState, 'randomState' | 'nextId'> {
  let randomState = state.randomState;
  let nextId = state.nextId;
  for (let index = 0; index < count; index += 1) {
    let random: number;
    [random, randomState] = nextRandom(randomState);
    const angle = -Math.PI * (0.15 + random * 0.7);
    [random, randomState] = nextRandom(randomState);
    const speed = (kind === 'star' ? 0.16 : 0.08) + random * 0.1;
    [random, randomState] = nextRandom(randomState);
    particles.push({
      id: nextId,
      kind,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: kind === 'star' ? 1.4 : 0.7,
      maxLife: kind === 'star' ? 1.4 : 0.7,
      size: (kind === 'star' ? 3 : 1.5) + random * 3,
    });
    nextId += 1;
  }
  return { randomState, nextId };
}

export function stepExpedition(
  state: ExpeditionState,
  input: ExpeditionInput,
  elapsedSeconds: number,
): ExpeditionState {
  const dt = clamp(elapsedSeconds, 0, 0.05);
  const time = state.time + dt;
  const charge = clamp(input.armAngle / Math.max(1, input.targetAngle), 0, 1);
  const targetProgress = input.completed
    ? 3
    : input.phase === 'target' || input.phase === 'lowering'
      ? Math.min(3, input.reps + 1)
      : input.phase === 'raising'
        ? Math.min(3, input.reps + charge * 0.78)
        : input.reps;
  const difference = targetProgress - state.petProgress;
  const petProgress = Math.abs(difference) < 0.005
    ? targetProgress
    : state.petProgress + Math.sign(difference) * Math.min(Math.abs(difference), dt * 1.75);

  const landed = input.reps > state.lastReps;
  const landingPulse = landed ? 1 : Math.max(0, state.landingPulse - dt * 2.5);
  let petMotion: PetMotion = 'idle';
  if (input.completed) petMotion = 'celebrate';
  else if (Math.abs(targetProgress - petProgress) > 0.015) petMotion = 'leap';
  else if (landingPulse > 0.45) petMotion = 'land';
  else if (input.phase === 'raising' && charge > 0.62) petMotion = 'charge';
  else if (input.phase === 'raising') petMotion = 'anticipate';

  const platformSprings = state.platformSprings.map((spring) => {
    let velocity = spring.velocity + (-32 * spring.offset - 7.5 * spring.velocity) * dt;
    if (landed && input.reps > 0 && input.reps < 3 && input.reps - 1 === state.platformSprings.indexOf(spring)) {
      velocity += 0.72;
    }
    return { offset: spring.offset + velocity * dt, velocity };
  });

  let randomState = state.randomState;
  let nextId = state.nextId;
  const particles = state.particles.flatMap((particle) => {
    if (particle.kind === 'snow') {
      return [{
        ...particle,
        x: (particle.x + particle.vx * dt + 1) % 1,
        y: (particle.y + particle.vy * dt) % 1,
      }];
    }
    const life = particle.life - dt;
    if (life <= 0) return [];
    return [{
      ...particle,
      x: particle.x + particle.vx * dt,
      y: particle.y + particle.vy * dt,
      vy: particle.vy + 0.22 * dt,
      life,
    }];
  });

  let spawnAccumulator = state.spawnAccumulator + dt;
  if ((petMotion === 'charge' || petMotion === 'leap') && spawnAccumulator > 0.08) {
    const emitted = emitBurst(state, particles, 'spark', progressPosition(petProgress), 0.62, 2);
    randomState = emitted.randomState;
    nextId = emitted.nextId;
    spawnAccumulator = 0;
  }
  if (landed) {
    const emitted = emitBurst({ ...state, randomState, nextId }, particles, 'star', progressPosition(input.reps), 0.6, input.reps >= 3 ? 22 : 12);
    randomState = emitted.randomState;
    nextId = emitted.nextId;
  }

  const ripples = state.ripples
    .map((ripple) => ({ ...ripple, age: ripple.age + dt }))
    .filter((ripple) => ripple.age < 1.2);
  if (landed) ripples.push({ id: nextId++, x: progressPosition(input.reps), age: 0 });

  return {
    ...state,
    randomState,
    nextId,
    time,
    petProgress,
    petMotion,
    charge,
    landingPulse,
    lastReps: input.reps,
    spawnAccumulator,
    platformSprings,
    particles: particles.slice(-140),
    ripples,
  };
}
