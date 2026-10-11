import { describe, expect, it } from 'vitest';
import { gauge } from './gauge';
import { TEST_PROFILE } from './testFixtures';

describe('gauge', () => {
  it('derives all four measurements without changing the profile', () => {
    const profile = Object.freeze({ ...TEST_PROFILE });
    expect(gauge(profile)).toEqual({
      stitchWidthCm: 0.625,
      rowHeightCm: 10 / 18,
      yarnPerStitchCm: 3.8,
      carriedPerStitchCm: 0.625 * 1.1,
    });
  });

  it.each(['swatchStitches', 'swatchRows', 'swatchWidthCm', 'swatchHeightCm', 'yarnMeasuredCm', 'yarnMeasuredStitches'] as const)(
    'rejects invalid divisors and measurements in %s', (field) => {
      for (const value of [0, -1, NaN, Infinity]) {
        expect(() => gauge({ ...TEST_PROFILE, [field]: value })).toThrow(RangeError);
      }
    },
  );

  it('allows a zero carried factor and rejects invalid factors', () => {
    expect(gauge({ ...TEST_PROFILE, carriedFactor: 0 }).carriedPerStitchCm).toBe(0);
    for (const carriedFactor of [-1, NaN, Infinity]) {
      expect(() => gauge({ ...TEST_PROFILE, carriedFactor })).toThrow(RangeError);
    }
  });
});
