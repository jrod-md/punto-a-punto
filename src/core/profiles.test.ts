import { describe, expect, it } from 'vitest';
import {
  calibratedProfile,
  calibrationSummary,
  changeProjectProfile,
  profileDraft,
  profileProjectNames,
  validateProfileStep,
  yarnSettings,
} from './profiles';
import { DEFAULT_PROFILES } from './defaults';
import type { Project } from './types';
import { yarn } from './yarn';

const draft = {
  ...profileDraft(),
  name: 'Algodón de prueba',
  hookMm: '4',
  swatchStitches: '20',
  swatchRows: '20',
  swatchWidthCm: '10',
  swatchHeightCm: '9',
  yarnMeasuredStitches: '50',
};
const profile = calibratedProfile(draft, 'own');
const project: Project = {
  id: 'p',
  name: 'Manta',
  profileId: 'own',
  construction: 'flat',
  cols: 10,
  rows: 10,
  palette: [
    { id: 'a', name: 'A', hex: '#ffffff' },
    { id: 'b', name: 'B', hex: '#303030' },
  ],
  backgroundColorId: 'a',
  cells: Array.from({ length: 100 }, (_, i) => (i < 50 || i % 10 < 5 ? 0 : 1)),
  carryAlways: false,
  marginPercent: 10,
  progress: { row: 1, stitch: 1 },
  tapStep: 5,
};

describe('calibration and yarn acceptance', () => {
  it('starts with two meters and converts meters to centimeters', () => {
    expect(profileDraft().yarnMeasuredMeters).toBe('2');
    expect(profile.yarnMeasuredCm).toBe(200);
    expect(profile.approximate).toBe(false);
  });
  it('produces the specified gauge and 40 cm piece', () => {
    const result = calibrationSummary(profile);
    expect(result.stitchesPer10Cm).toBe(20);
    expect(result.rowsPer10Cm).toBeCloseTo(22.222222);
    expect(result.yarnPerStitchCm).toBe(4);
    expect(result.piece.cols).toBe(80);
    expect(result.piece.rows).toBe(89);
    expect(result.smallSwatch).toBe(false);
  });
  it('round trips a profile including optional balls and zero carried factor', () => {
    const complete = calibratedProfile(
      { ...draft, metersPerBall: '100', carriedFactor: '0' },
      'p',
    );
    expect(calibratedProfile(profileDraft(complete), 'p')).toEqual(complete);
    expect(profileDraft(DEFAULT_PROFILES[0]).name).toBe(
      DEFAULT_PROFILES[0]!.name,
    );
  });
  it('keeps factory measurements approximate until the user supplies her measurements', () => {
    const factory = DEFAULT_PROFILES[0]!;
    expect(
      calibratedProfile(
        {
          ...profileDraft(factory),
          name: 'Nueva etiqueta',
          metersPerBall: '100',
        },
        factory.id,
        factory,
      ).approximate,
    ).toBe(true);
    expect(
      calibratedProfile(
        { ...profileDraft(factory), swatchWidthCm: '11' },
        factory.id,
        factory,
      ).approximate,
    ).toBe(false);
    expect(
      calibratedProfile(profileDraft(profile), profile.id, profile).approximate,
    ).toBe(false);
  });
  it('warns for either dimension under fifteen without blocking', () => {
    for (const key of ['swatchStitches', 'swatchRows'] as const) {
      expect(
        calibrationSummary(calibratedProfile({ ...draft, [key]: '14' }, 'p'))
          .smallSwatch,
      ).toBe(true);
      expect(validateProfileStep({ ...draft, [key]: '14' }, 1)).toEqual({});
    }
  });
  it('rejects empty, zero, negative, nonfinite, fractional counts and impossible values', () => {
    for (const value of ['', '0', '-1', 'Infinity', 'NaN', '10001', '1.5'])
      expect(
        validateProfileStep({ ...draft, swatchStitches: value }, 1)
          .swatchStitches,
      ).toBeTruthy();
    for (const value of ['', '0', '-1', 'Infinity', '1001', '0.001'])
      expect(
        validateProfileStep({ ...draft, swatchWidthCm: value }, 1)
          .swatchWidthCm,
      ).toBeTruthy();
    expect(
      validateProfileStep({ ...draft, name: ' ', hookMm: '51' }, 0),
    ).toHaveProperty('name');
    expect(
      validateProfileStep(
        { ...draft, yarnMeasuredStitches: '0', yarnMeasuredMeters: '' },
        2,
      ),
    ).toHaveProperty('yarnMeasuredMeters');
    expect(
      validateProfileStep(
        { ...draft, metersPerBall: '0', carriedFactor: '-1' },
        3,
      ),
    ).toHaveProperty('metersPerBall');
    expect(() => validateProfileStep(draft, 4)).toThrow();
    expect(() => calibratedProfile({ ...draft, hookMm: '0' }, 'p')).toThrow();
    expect(() => calibratedProfile(draft, '')).toThrow();
  });
  it('lists precisely the projects preventing deletion', () => {
    expect(
      profileProjectNames('own', [
        project,
        { ...project, name: 'Top' },
        { ...project, profileId: 'other', name: 'Otro' },
      ]),
    ).toEqual(['Manta', 'Top']);
    expect(profileProjectNames('unused', [project])).toEqual([]);
  });
  it('changes gauge without changing any cells or progress', () => {
    const next = changeProjectProfile(project, DEFAULT_PROFILES[0]!);
    expect(next.cells).toBe(project.cells);
    expect(next.progress).toBe(project.progress);
    expect(next.cols).toBe(10);
    expect(next.profileId).toBe(DEFAULT_PROFILES[0]!.id);
    expect(changeProjectProfile(project, profile)).toBe(project);
  });
  it('shows 3.8 m of A and 1.6 m of B and optional balls', () => {
    expect(
      yarn(project, { ...profile, metersPerBall: 2 }).map(
        ({ meters, balls }) => ({ meters, balls }),
      ),
    ).toEqual([
      { meters: 3.8, balls: 2 },
      { meters: 1.6, balls: 1 },
    ]);
    const changed = yarnSettings(project, 20, true);
    expect(changed.cells).toBe(project.cells);
    expect(yarn(changed, profile)[1]!.carriedStitches).toBe(75);
    expect(yarnSettings(project, 10, false)).toBe(project);
    for (const margin of [-1, Infinity, NaN, 1001])
      expect(() => yarnSettings(project, margin, false)).toThrow();
  });
});
