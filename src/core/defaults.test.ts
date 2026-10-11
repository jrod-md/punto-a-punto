import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILES } from './defaults';
import { gauge } from './gauge';

describe('factory defaults', () => {
  it('contains the two specified approximate profiles and unique ids', () => {
    expect(DEFAULT_PROFILES).toHaveLength(2);
    expect(new Set(DEFAULT_PROFILES.map((profile) => profile.id)).size).toBe(2);
    for (const [index, profile] of DEFAULT_PROFILES.entries()) {
      expect(profile.approximate).toBe(true);
      expect(profile.name).toContain('aproximado');
      expect(profile.carriedFactor).toBe(1.1);
      expect(profile.metersPerBall).toBeUndefined();
      expect([profile.hookMm, profile.swatchStitches, profile.swatchRows, profile.swatchWidthCm, profile.swatchHeightCm])
        .toEqual(index === 0 ? [3, 22, 24, 10, 10] : [4, 16, 18, 10, 10]);
      expect(gauge(profile).yarnPerStitchCm).toBe(index === 0 ? 2.6 : 3.8);
    }
  });

  it('allows editing copies without changing factory values', () => {
    const profile = DEFAULT_PROFILES[0];
    expect(profile).toBeDefined();
    const edited = { ...profile, name: 'Mi muestra', approximate: false };
    expect(edited.approximate).toBe(false);
    expect(profile?.approximate).toBe(true);
  });
});
