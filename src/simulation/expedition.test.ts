import { describe, expect, it } from 'vitest';
import { biomeForSeed, createExpedition, hashSeed, progressPosition, stepExpedition, waterHeight } from './expedition';

const ready = { reps: 0, phase: 'ready' as const, armAngle: 20, targetAngle: 85, completed: false };

describe('expedition simulation', () => {
  it('is deterministic for the same seed and inputs', () => {
    const first = stepExpedition(createExpedition(42), { ...ready, phase: 'raising', armAngle: 70 }, 0.016);
    const second = stepExpedition(createExpedition(42), { ...ready, phase: 'raising', armAngle: 70 }, 0.016);
    expect(first).toEqual(second);
  });

  it('uses the target phase to launch toward the next stop', () => {
    const state = stepExpedition(createExpedition(10), { ...ready, phase: 'target', armAngle: 90 }, 0.05);
    expect(state.petMotion).toBe('leap');
    expect(state.petProgress).toBeGreaterThan(0);
  });

  it('emits a landing response exactly when rep count advances', () => {
    const before = createExpedition(9);
    const landed = stepExpedition(before, { ...ready, reps: 1 }, 0.016);
    const steady = stepExpedition(landed, { ...ready, reps: 1 }, 0.016);
    expect(landed.ripples).toHaveLength(1);
    expect(steady.ripples).toHaveLength(1);
    expect(landed.particles.filter((particle) => particle.kind === 'star')).toHaveLength(12);
  });

  it('keeps seeded biome, route positions and water repeatable', () => {
    expect(hashSeed('Mochi')).toBe(hashSeed('Mochi'));
    expect(biomeForSeed(3).id).toBe('moonlit-glacier');
    expect(progressPosition(0)).toBeCloseTo(0.12);
    expect(progressPosition(3)).toBeCloseTo(0.84);
    expect(waterHeight(0.3, 4)).toBe(waterHeight(0.3, 4));
  });
});
