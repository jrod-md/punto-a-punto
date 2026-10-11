import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILES } from './defaults';
import { sizing } from './sizing';
import { TEST_PROFILE } from './testFixtures';

describe('sizing', () => {
  it('calculates 64 stitches by 72 rows for 40 cm with the 4 mm default', () => {
    const profile = DEFAULT_PROFILES.find((item) => item.hookMm === 4);
    if (!profile) throw new Error('Missing test profile');
    expect(sizing(profile, 40, 40)).toEqual({ cols: 64, rows: 72, realWidthCm: 40, realHeightCm: 40 });
  });

  it.each([0, 0.01, 0.1])('clamps tiny targets (%s cm) to one stitch and row', (target) => {
    expect(sizing(TEST_PROFILE, target, target)).toEqual({
      cols: 1, rows: 1, realWidthCm: 0.625, realHeightCm: 10 / 18,
    });
  });

  it('rounds to the nearest count and reports the actual size', () => {
    const result = sizing(TEST_PROFILE, 1, 1);
    expect(result).toEqual({ cols: 2, rows: 2, realWidthCm: 1.25, realHeightCm: 20 / 18 });
    expect(sizing(TEST_PROFILE, 0.9375, 1).cols).toBe(2);
  });

  it.each([-1, NaN, Infinity])('rejects invalid targets: %s', (target) => {
    expect(() => sizing(TEST_PROFILE, target, 40)).toThrow(RangeError);
    expect(() => sizing(TEST_PROFILE, 40, target)).toThrow(RangeError);
  });
});
