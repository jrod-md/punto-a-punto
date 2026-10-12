import { expect, it } from 'vitest';
import { gridTiles, patternDocument, patternHeading } from './patternDocument';
import { TEST_PROFILE, TEST_PROJECT } from './testFixtures';
it('builds consistent flat and round headings from the real gauge, including one cell', () => {
  expect(patternHeading(TEST_PROJECT, TEST_PROFILE)).toEqual([
    'Ejemplo',
    '4 puntos × 2 filas',
    'Tamaño real: 2,5 × 1,11 cm',
    'Muestra: Muestra propia',
    'En plano',
  ]);
  expect(
    patternHeading(
      { ...TEST_PROJECT, cols: 1, rows: 1, construction: 'round' },
      TEST_PROFILE,
    ),
  ).toContain('1 punto × 1 vuelta');
  expect(
    patternHeading({ ...TEST_PROJECT, construction: 'round' }, TEST_PROFILE),
  ).toContain('En redondo (espiral continua)');
  expect(() =>
    patternHeading(TEST_PROJECT, { ...TEST_PROFILE, swatchWidthCm: 0 }),
  ).toThrow();
});
it('uses the existing pattern and yarn formulas with metadata, warnings and all individual rows', () => {
  const document = patternDocument(
    { ...TEST_PROJECT, cells: [0, 0, 1, 1, 0, 0, 1, 1] },
    { ...TEST_PROFILE, approximate: true, metersPerBall: 100 },
  );
  expect(document.heading).toContain('Tamaño real: 2,5 × 1,11 cm');
  expect(document.written.rows).toHaveLength(2);
  expect(document.estimates).toHaveLength(2);
  expect(
    document.estimates.reduce((sum, entry) => sum + entry.workedStitches, 0),
  ).toBe(TEST_PROJECT.cols * TEST_PROJECT.rows);
  expect(document.text).toContain('4 puntos ·');
  expect(document.text).toContain('Muestra: Muestra propia');
  expect(document.text).toContain('ovillo');
  expect(document.text).toContain('Esta muestra es aproximada');
  expect(document.totalMeters).toBeCloseTo(
    document.estimates.reduce((sum, entry) => sum + entry.meters, 0),
  );
  expect(
    patternDocument(
      { ...TEST_PROJECT, construction: 'round', carryAlways: true },
      TEST_PROFILE,
    ).text,
  ).toContain('Vuelta 1');
});
it('tiles the grid exactly once, bottom rows first, with valid partial tiles', () => {
  const tiles = gridTiles(200, 200, 75, 100);
  expect(tiles).toHaveLength(6);
  expect(gridTiles(64, 72, 75, 100)).toEqual([
    { left: 0, bottom: 0, cols: 64, rows: 72 },
  ]);
  const visited = new Set<number>();
  for (const tile of tiles)
    for (let row = tile.bottom; row < tile.bottom + tile.rows; row++)
      for (let col = tile.left; col < tile.left + tile.cols; col++) {
        const index = row * 200 + col;
        expect(visited.has(index)).toBe(false);
        visited.add(index);
      }
  expect(visited.size).toBe(40000);
  expect(gridTiles(1, 1, 75, 100)).toHaveLength(1);
  for (const value of [0, -1, 0.5, Infinity])
    expect(() => gridTiles(value, 1, 75, 100)).toThrow();
});
