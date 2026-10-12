import { describe, expect, it } from 'vitest';
import {
  commitHistory,
  createHistory,
  paintStroke,
  undoHistory,
} from './editor';
import { mirroredIndices } from './mirror';
import { TEST_PROJECT } from './testFixtures';

describe('vertical mirror', () => {
  it('reflects column 3 to 18 on a piece of 20 in the same row', () => {
    expect([...mirroredIndices(20, 3, [22])]).toEqual([22, 37]);
  });
  it('does not duplicate column 11 on a piece of 21 or already reflected pairs', () => {
    expect([...mirroredIndices(21, 1, [10, 10])]).toEqual([10]);
    expect([...mirroredIndices(20, 1, [2, 17])]).toEqual([2, 17]);
  });
  it('paints and erases a whole reflected stroke with a single undo', () => {
    const original = {
      ...TEST_PROJECT,
      cols: 20,
      rows: 3,
      cells: Array<number>(60).fill(0),
    };
    const indices = mirroredIndices(20, 3, [2, 23, 44]);
    const painted = paintStroke(original, indices, 1);
    expect(painted.cells.filter((color) => color === 1)).toHaveLength(6);
    const history = commitHistory(createHistory(original), painted);
    expect(undoHistory(history).present).toBe(original);
    const erased = paintStroke(painted, indices, 0);
    expect(erased.cells).toEqual(original.cells);
    expect(undoHistory(commitHistory(history, erased)).present).toBe(painted);
  });
  it('handles empty strokes and rejects out of bounds or fractional coordinates', () => {
    expect(mirroredIndices(20, 3, []).size).toBe(0);
    for (const index of [-1, 60, 0.5])
      expect(() => mirroredIndices(20, 3, [index])).toThrow();
    expect(() => mirroredIndices(0, 3, [])).toThrow();
  });
});
