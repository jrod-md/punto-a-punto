import { describe, expect, it } from 'vitest';
import {
  adjustProgress,
  advanceProgress,
  commitProgress,
  currentRun,
  finishRow,
  nextRow,
  previousRow,
  progressHistory,
  readingColumn,
  undoProgress,
} from './weaving';
import { TEST_PROJECT } from './testFixtures';
import type { Project } from './types';
import { pattern } from './pattern';
const asymmetric: Project = {
  ...TEST_PROJECT,
  cols: 10,
  rows: 2,
  cells: [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
  tapStep: 'color-run',
};
describe('weaving', () => {
  it('reads the required asymmetric row and advances 5, 2, 3 without crossing', () => {
    expect(pattern(asymmetric).rows[0]!.text).toBe(
      'Fila 1 (← derecha a izquierda): 5 A, 2 B, 3 A — 10 puntos',
    );
    let project = asymmetric;
    for (const count of [5, 2, 3]) {
      const result = advanceProgress(project);
      expect(result.advanced).toBe(count);
      project = { ...project, progress: result.progress };
    }
    expect(advanceProgress(project).needsNextRow).toBe(true);
    expect(advanceProgress(project).progress).toEqual({ row: 1, stitch: 11 });
  });
  it('advances 5, 5 and 2 in a row of twelve then requests confirmation', () => {
    let project = {
      ...TEST_PROJECT,
      cols: 12,
      rows: 2,
      cells: Array<number>(24).fill(0),
    };
    for (const count of [5, 5, 2]) {
      const result = advanceProgress(project);
      expect(result.advanced).toBe(count);
      project = { ...project, progress: result.progress };
    }
    expect(advanceProgress(project).needsNextRow).toBe(true);
    expect(nextRow(project)).toEqual({ row: 2, stitch: 1 });
  });
  it('undoes passing to a row back to the complete previous row', () => {
    const project = { ...asymmetric, progress: { row: 1, stitch: 11 } };
    const history = commitProgress(progressHistory(project), nextRow(project));
    expect(undoProgress(history).present).toEqual({ row: 1, stitch: 11 });
    expect(undoProgress(progressHistory(project)).present).toEqual(
      project.progress,
    );
  });
  it('alternates flat direction and keeps all round rows right to left', () => {
    expect(readingColumn(asymmetric, 1, 1)).toBe(9);
    expect(readingColumn(asymmetric, 2, 1)).toBe(0);
    expect(readingColumn({ ...asymmetric, construction: 'round' }, 2, 1)).toBe(
      9,
    );
    expect(
      currentRun({ ...asymmetric, progress: { row: 2, stitch: 1 } })!.remaining,
    ).toBe(3);
  });
  it('reports remaining and next runs in words including a partially worked run', () => {
    expect(
      currentRun({ ...asymmetric, progress: { row: 1, stitch: 3 } }),
    ).toEqual({ remaining: 3, colorId: 'a', next: { count: 2, colorId: 'b' } });
    expect(
      currentRun({ ...asymmetric, progress: { row: 1, stitch: 9 } })!.next,
    ).toBeNull();
    expect(
      currentRun({ ...asymmetric, progress: { row: 1, stitch: 11 } }),
    ).toBeNull();
    expect(() => currentRun({ ...asymmetric, cells: [] })).toThrow();
  });
  it('finishes the last row and never advances beyond the piece', () => {
    const project = { ...TEST_PROJECT, cols: 1, rows: 1, cells: [0] };
    const result = advanceProgress(project, 10);
    expect(result.finished).toBe(true);
    expect(result.advanced).toBe(1);
    const finished = { ...project, progress: result.progress };
    expect(advanceProgress(finished)).toMatchObject({
      finished: true,
      needsNextRow: false,
      advanced: 0,
    });
    expect(nextRow(finished)).toEqual(finished.progress);
    expect(finishRow(finished)).toEqual(finished.progress);
  });
  it('finishes, returns to the previous row and refuses to skip an unfinished row', () => {
    expect(finishRow(asymmetric)).toEqual({ row: 1, stitch: 11 });
    expect(
      previousRow({ ...asymmetric, progress: { row: 2, stitch: 3 } }),
    ).toEqual({ row: 1, stitch: 11 });
    expect(previousRow(asymmetric)).toEqual(asymmetric.progress);
    expect(() => nextRow(asymmetric)).toThrow();
  });
  it('adjusts progress after smaller dimensions and preserves a valid resumed point', () => {
    expect(
      adjustProgress({ cols: 12, rows: 20, progress: { row: 7, stitch: 10 } }),
    ).toEqual({ row: 7, stitch: 10 });
    expect(
      adjustProgress({ cols: 4, rows: 2, progress: { row: 7, stitch: 10 } }),
    ).toEqual({ row: 2, stitch: 5 });
    expect(
      adjustProgress({ cols: 4, rows: 2, progress: { row: 0, stitch: -1 } }),
    ).toEqual({ row: 1, stitch: 1 });
    expect(() =>
      adjustProgress({ cols: 4, rows: 2, progress: { row: NaN, stitch: 1 } }),
    ).toThrow();
  });
  it('rejects invalid steps and coordinates and keeps only small progress snapshots', () => {
    for (const step of [0, -1, 0.5, Infinity])
      expect(() => advanceProgress(asymmetric, step)).toThrow();
    expect(() => readingColumn(asymmetric, 0, 1)).toThrow();
    expect(() => readingColumn(asymmetric, 1, 11)).toThrow();
    let history = progressHistory(asymmetric);
    expect(commitProgress(history, history.present)).toBe(history);
    for (let i = 0; i < 120; i++)
      history = commitProgress(history, { row: 1, stitch: (i % 2) + 1 });
    expect(history.past).toHaveLength(100);
    expect(asymmetric.progress).toEqual({ row: 1, stitch: 1 });
  });
});
