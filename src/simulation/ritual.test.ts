import { describe, expect, it } from 'vitest';
import { nextRitualStop, ritualRoutePoint, ritualStopForRep } from './ritual';

describe('warmth ritual journey', () => {
  it('maps three rewards to three distinct destinations', () => {
    expect([1, 2, 3].map((rep) => ritualStopForRep(rep).id)).toEqual([
      'lantern-garden',
      'studio-bridge',
      'sunroom-lookout',
    ]);
  });

  it('clamps progress and bends the route over the tiny world', () => {
    expect(ritualRoutePoint(-1)).toEqual(ritualRoutePoint(0));
    expect(ritualRoutePoint(4)).toEqual(ritualRoutePoint(3));
    expect(ritualRoutePoint(1.5).y).toBeLessThan(ritualRoutePoint(0).y);
  });

  it('keeps the next destination stable after completion', () => {
    expect(nextRitualStop(0).shortName).toBe('Garden');
    expect(nextRitualStop(3).shortName).toBe('Lookout');
  });
});
