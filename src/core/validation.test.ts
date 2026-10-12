import { describe, expect, it } from 'vitest';
import { TEST_PROJECT } from './testFixtures';
import {
  requireInteger,
  requireNonNegative,
  requirePositive,
  validateDimensions,
  validateGrid,
  validateProject,
} from './validation';

describe('numeric validation', () => {
  it('accepts valid positive numbers, nonnegative numbers and safe integers', () => {
    expect(() => requirePositive(0.1, 'Medida')).not.toThrow();
    expect(() => requireNonNegative(0, 'Medida')).not.toThrow();
    expect(() => requireInteger(-3, 'Posición')).not.toThrow();
  });

  it.each([0, -1, NaN, Infinity, -Infinity])(
    'rejects nonpositive or nonfinite positive inputs: %s',
    (value) => {
      expect(() => requirePositive(value, 'Medida')).toThrow(RangeError);
    },
  );

  it.each([-1, NaN, Infinity, -Infinity])(
    'rejects negative or nonfinite nonnegative inputs: %s',
    (value) => {
      expect(() => requireNonNegative(value, 'Medida')).toThrow(RangeError);
    },
  );

  it.each([0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects unsafe or fractional integers: %s',
    (value) => {
      expect(() => requireInteger(value, 'Posición')).toThrow(RangeError);
    },
  );
});

describe('grid and project validation', () => {
  it('accepts valid dimensions, grids and projects', () => {
    expect(() => validateDimensions(200, 200)).not.toThrow();
    expect(() => validateGrid(TEST_PROJECT)).not.toThrow();
    expect(() => validateProject(TEST_PROJECT)).not.toThrow();
  });

  it.each([0, -1, 0.5, NaN, Infinity])(
    'rejects invalid dimensions: %s',
    (value) => {
      expect(() => validateDimensions(value, 2)).toThrow(RangeError);
      expect(() => validateDimensions(2, value)).toThrow(RangeError);
    },
  );

  it('rejects unsafe cell counts, mismatched grids and invalid indices', () => {
    expect(() => validateDimensions(Number.MAX_SAFE_INTEGER, 2)).toThrow(
      RangeError,
    );
    expect(() => validateGrid({ cols: 2, rows: 2, cells: [0] })).toThrow(
      RangeError,
    );
    expect(() => validateGrid({ cols: 1, rows: 1, cells: [-1] })).toThrow(
      RangeError,
    );
    expect(() => validateGrid({ cols: 1, rows: 1, cells: [0.5] })).toThrow(
      RangeError,
    );
  });

  it('enforces palette size, unique ids, background and valid cell colors', () => {
    expect(() => validateProject({ ...TEST_PROJECT, palette: [] })).toThrow(
      RangeError,
    );
    const palette = Array.from({ length: 13 }, (_, index) => ({
      id: `${index}`,
      name: 'Color',
      hex: '#ffffff',
    }));
    expect(() =>
      validateProject({ ...TEST_PROJECT, palette, backgroundColorId: '0' }),
    ).toThrow(RangeError);
    expect(() =>
      validateProject({
        ...TEST_PROJECT,
        palette: [TEST_PROJECT.palette[0]!, TEST_PROJECT.palette[0]!],
      }),
    ).toThrow(RangeError);
    expect(() =>
      validateProject({ ...TEST_PROJECT, backgroundColorId: 'missing' }),
    ).toThrow(RangeError);
    expect(() =>
      validateProject({ ...TEST_PROJECT, cols: 1, rows: 1, cells: [3] }),
    ).toThrow(RangeError);
  });

  it.each([-1, NaN, Infinity])(
    'rejects invalid safety margins: %s',
    (marginPercent) => {
      expect(() => validateProject({ ...TEST_PROJECT, marginPercent })).toThrow(
        RangeError,
      );
    },
  );

  it('rejects malformed construction at runtime', () => {
    const project = JSON.parse(
      JSON.stringify({ ...TEST_PROJECT, construction: 'invalid' }),
    ) as typeof TEST_PROJECT;
    expect(() => validateProject(project)).toThrow(RangeError);
  });
});
