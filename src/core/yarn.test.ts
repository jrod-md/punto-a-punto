import { describe, expect, it } from 'vitest';
import { TEST_PROFILE, TEST_PROJECT } from './testFixtures';
import { estimateColorYarn, yarn } from './yarn';

describe('yarn', () => {
  it('adds no carried yarn on single-color rows when carryAlways is off', () => {
    const project = { ...TEST_PROJECT, rows: 1, cells: [0, 0, 0, 0], marginPercent: 0 };
    const a = estimateColorYarn(project, TEST_PROFILE, 'a');
    const b = estimateColorYarn(project, TEST_PROFILE, 'b');
    expect(a.workedStitches).toBe(4);
    expect(a.carriedStitches).toBe(0);
    expect(a.totalCm).toBeCloseTo(4 * 3.8 + 30);
    expect(b).toEqual({ colorId: 'b', workedStitches: 0, carriedStitches: 0, totalCm: 0, meters: 0 });
  });

  it('carries other project palette colors even on single-color rows with carryAlways', () => {
    const project = { ...TEST_PROJECT, cells: [0, 0, 0, 0, 1, 1, 1, 1], carryAlways: true, marginPercent: 0 };
    const a = estimateColorYarn(project, TEST_PROFILE, 'a');
    const b = estimateColorYarn(project, TEST_PROFILE, 'b');
    const c = estimateColorYarn(project, TEST_PROFILE, 'c');
    expect(a.carriedStitches).toBe(4);
    expect(b.carriedStitches).toBe(4);
    expect(c.workedStitches).toBe(0);
    expect(c.carriedStitches).toBe(8);
    expect(a.totalCm).toBeCloseTo(4 * 3.8 + 4 * 0.625 * 1.1 + 30);
    expect(b.totalCm).toBeCloseTo(a.totalCm);
    expect(estimateColorYarn({ ...project, carryAlways: false }, TEST_PROFILE, 'a').carriedStitches).toBe(0);
  });

  it('carries each of two colors for cols minus worked stitches', () => {
    const project = { ...TEST_PROJECT, rows: 1, cells: [0, 0, 0, 1], marginPercent: 0 };
    const a = estimateColorYarn(project, TEST_PROFILE, 'a');
    const b = estimateColorYarn(project, TEST_PROFILE, 'b');
    expect([a.workedStitches, a.carriedStitches]).toEqual([3, 1]);
    expect([b.workedStitches, b.carriedStitches]).toEqual([1, 3]);
    expect(a.totalCm).toBeCloseTo(3 * 3.8 + 1 * 0.625 * 1.1 + 30);
    expect(b.totalCm).toBeCloseTo(1 * 3.8 + 3 * 0.625 * 1.1 + 30);
    expect(estimateColorYarn(project, TEST_PROFILE, 'c').meters).toBe(0);
  });

  it('sums all rows and adds one pair of tails per used color', () => {
    const a = estimateColorYarn({ ...TEST_PROJECT, marginPercent: 0 }, TEST_PROFILE, 'a');
    expect(a.workedStitches).toBe(4);
    expect(a.carriedStitches).toBe(4);
    expect(a.totalCm).toBeCloseTo(4 * 3.8 + 4 * 0.625 * 1.1 + 30);
  });

  it.each([false, true])('gives an absent project color zero yarn and no tails (carryAlways=%s)', (carryAlways) => {
    const result = estimateColorYarn({ ...TEST_PROJECT, carryAlways }, { ...TEST_PROFILE, metersPerBall: 100 }, 'missing');
    expect(result).toEqual({ colorId: 'missing', workedStitches: 0, carriedStitches: 0, totalCm: 0, meters: 0, balls: 0 });
  });

  it('applies the margin after worked yarn, carried yarn and tails', () => {
    const base = estimateColorYarn({ ...TEST_PROJECT, marginPercent: 0 }, TEST_PROFILE, 'a');
    const margin = estimateColorYarn({ ...TEST_PROJECT, marginPercent: 25 }, TEST_PROFILE, 'a');
    expect(margin.totalCm).toBeCloseTo(base.totalCm * 1.25);
    expect(margin.meters).toBe(Math.ceil(margin.totalCm / 10) / 10);
  });

  it.each([[100, 1], [101, 1.1], [110, 1.1], [111, 1.2]])('rounds %s cm upward to %s meters', (totalCm, meters) => {
    const project = { ...TEST_PROJECT, cols: 1, rows: 1, cells: [0], marginPercent: 0 };
    const profile = { ...TEST_PROFILE, yarnMeasuredCm: totalCm - 30, yarnMeasuredStitches: 1 };
    expect(estimateColorYarn(project, profile, 'a').meters).toBe(meters);
  });

  it('reports whole balls only when metersPerBall is supplied', () => {
    const project = { ...TEST_PROJECT, cols: 1, rows: 1, cells: [0], marginPercent: 0 };
    const profile = { ...TEST_PROFILE, yarnMeasuredCm: 71, yarnMeasuredStitches: 1, metersPerBall: 1 };
    expect(estimateColorYarn(project, profile, 'a')).toMatchObject({ totalCm: 101, meters: 1.1, balls: 2 });
    expect(estimateColorYarn(project, { ...profile, yarnMeasuredCm: 70 }, 'a').balls).toBe(1);
    expect(estimateColorYarn(project, TEST_PROFILE, 'a')).not.toHaveProperty('balls');
  });

  it('returns estimates in palette order without mutating the project', () => {
    const snapshot = structuredClone(TEST_PROJECT);
    const estimates = yarn(TEST_PROJECT, TEST_PROFILE);
    expect(estimates.map((estimate) => estimate.colorId)).toEqual(['a', 'b', 'c']);
    for (const result of estimates) expect(result).toEqual(estimateColorYarn(TEST_PROJECT, TEST_PROFILE, result.colorId));
    expect(TEST_PROJECT).toEqual(snapshot);
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid meters per ball: %s', (metersPerBall) => {
    expect(() => yarn(TEST_PROJECT, { ...TEST_PROFILE, metersPerBall })).toThrow(RangeError);
    expect(() => estimateColorYarn(TEST_PROJECT, { ...TEST_PROFILE, metersPerBall }, 'a')).toThrow(RangeError);
  });
});
