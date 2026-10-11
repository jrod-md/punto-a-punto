import { describe, expect, it } from 'vitest';
import { exportProjectFile, packProject, parseProjectFile, unpackProject, validateEditorSize } from './projectFile';
import { TEST_PROFILE, TEST_PROJECT } from './testFixtures';

const record = { ...TEST_PROJECT, updatedAt: '2026-10-11T18:00:00.000Z' };

describe('project files and compact cells', () => {
  it('round-trips a complete versioned project and its profile identically', () => {
    expect(parseProjectFile(exportProjectFile(record, TEST_PROFILE))).toEqual({ formatVersion: 1, project: record, profile: TEST_PROFILE });
    const profile = { ...TEST_PROFILE, metersPerBall: 150 };
    expect(parseProjectFile(exportProjectFile(record, profile)).profile).toEqual(profile);
  });

  it('packs cells into one byte each and unpacks immutably', () => {
    const packed = packProject(record);
    expect(packed.cells).toBeInstanceOf(Uint8Array);
    expect(packed.cells.byteLength).toBe(record.cols * record.rows);
    expect(unpackProject(packed)).toEqual(record);
    expect(record.cells).toEqual(TEST_PROJECT.cells);
  });

  it.each(['no es json', 'null', '[]', '{}', '{"formatVersion":2}'])('rejects invalid files: %s', (source) => {
    expect(() => parseProjectFile(source)).toThrow();
  });

  it.each([
    { cells: [0] }, { cells: [0, 0, 0, 0, 0, 0, 0, 12] }, { palette: [] }, { name: '' }, { updatedAt: 'invalid' },
    { profileId: 'missing' }, { progress: { row: 3, stitch: 1 } }, { tapStep: 0 }, { carryAlways: 'sí' }, { cols: 1001 },
    { marginPercent: -1 }, { construction: 'diagonal' }, { backgroundColorId: 'missing' },
    { palette: [{ id: 'a', name: 'Blanco', hex: 'red' }] },
  ])('rejects malformed project data without altering the original: %j', (patch) => {
    const before = structuredClone(record);
    expect(() => parseProjectFile(JSON.stringify({ formatVersion: 1, project: { ...record, ...patch }, profile: TEST_PROFILE }))).toThrow();
    expect(record).toEqual(before);
  });

  it.each([{ swatchStitches: 0 }, { approximate: 'sí' }, { hookMm: -1 }, { metersPerBall: 0 }, { yarnMeasuredStitches: 0.5 }])('rejects invalid profiles: %j', (patch) => {
    expect(() => parseProjectFile(JSON.stringify({ formatVersion: 1, project: record, profile: { ...TEST_PROFILE, ...patch } }))).toThrow();
  });

  it('accepts the editor size boundaries and rejects invalid dimensions', () => {
    expect(() => validateEditorSize(1, 1000)).not.toThrow();
    for (const value of [0, -1, 0.5, 1001, Infinity, NaN]) expect(() => validateEditorSize(value, 200)).toThrow();
  });
});
