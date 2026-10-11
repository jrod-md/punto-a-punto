import { describe, expect, it } from 'vitest';
import { pattern } from './pattern';
import { TEST_PROJECT } from './testFixtures';

describe('pattern', () => {
  it('reads asymmetric flat rows from right on odd rows and left on even rows', () => {
    const result = pattern(TEST_PROJECT);
    expect(result.rows.map((row) => row.text)).toEqual([
      'Fila 1 (← derecha a izquierda): 1 C, 1 B, 2 A — 4 puntos',
      'Fila 2 (→ izquierda a derecha): 1 B, 2 A, 1 C — 4 puntos',
    ]);
    expect(result.rows.map((row) => row.direction)).toEqual(['right-to-left', 'left-to-right']);
    expect(result.rows.map((row) => row.row)).toEqual([1, 2]);
  });

  it('reads every round row right-to-left and labels them Vuelta', () => {
    const result = pattern({ ...TEST_PROJECT, construction: 'round' });
    expect(result.rows.map((row) => row.text)).toEqual([
      'Vuelta 1 (← derecha a izquierda): 1 C, 1 B, 2 A — 4 puntos',
      'Vuelta 2 (← derecha a izquierda): 1 C, 2 A, 1 B — 4 puntos',
    ]);
    expect(result.rows.every((row) => row.direction === 'right-to-left')).toBe(true);
  });

  it('groups consecutive colors but keeps separated runs distinct', () => {
    const result = pattern({ ...TEST_PROJECT, cols: 6, rows: 1, cells: [0, 0, 1, 1, 0, 0] });
    expect(result.rows[0]?.runs).toEqual([
      { letter: 'A', colorId: 'a', count: 2 },
      { letter: 'B', colorId: 'b', count: 2 },
      { letter: 'A', colorId: 'a', count: 2 },
    ]);
  });

  it('includes a legend in palette order and reports the correct total for each row', () => {
    const result = pattern(TEST_PROJECT);
    expect(result.legend).toEqual([
      { letter: 'A', colorId: 'a', name: 'Crema' },
      { letter: 'B', colorId: 'b', name: 'Verde' },
      { letter: 'C', colorId: 'c', name: 'Azul' },
    ]);
    expect(result.text).toContain('A → Crema\nB → Verde\nC → Azul');
    for (const row of result.rows) {
      expect(row.total).toBe(TEST_PROJECT.cols);
      expect(row.runs.reduce((sum, run) => sum + run.count, 0)).toBe(TEST_PROJECT.cols);
    }
  });

  it('supports a one-cell pattern and all 12 palette letters', () => {
    const palette = Array.from({ length: 12 }, (_, index) => ({ id: `color-${index}`, name: `Color ${index + 1}`, hex: '#ffffff' }));
    const result = pattern({ ...TEST_PROJECT, cols: 1, rows: 1, cells: [11], palette, backgroundColorId: 'color-0' });
    expect(result.rows[0]?.text).toBe('Fila 1 (← derecha a izquierda): 1 L — 1 puntos');
    expect(result.legend[11]?.letter).toBe('L');
  });

  it('does not mutate cell order when reversing rows', () => {
    const snapshot = structuredClone(TEST_PROJECT);
    pattern(TEST_PROJECT);
    expect(TEST_PROJECT).toEqual(snapshot);
  });
});
