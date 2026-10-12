import { describe, expect, it } from 'vitest';
import {
  commitHistory,
  createHistory,
  deleteColor,
  floodFill,
  linePoints,
  moveSelection,
  paintStroke,
  redoHistory,
  resizeProject,
  selectionBounds,
  undoHistory,
} from './editor';
import { TEST_PROJECT } from './testFixtures';

describe('editor operations', () => {
  it('commits an entire stroke as one immutable history step', () => {
    const original = {
      ...TEST_PROJECT,
      cells: Object.freeze([...TEST_PROJECT.cells]),
    };
    const painted = paintStroke(original, new Set([0, 1, 2]), 2);
    const history = commitHistory(createHistory(original), painted);
    expect(painted.cells.slice(0, 4)).toEqual([2, 2, 2, 2]);
    expect(original.cells).toEqual(TEST_PROJECT.cells);
    expect(history.past).toHaveLength(1);
    expect(undoHistory(history).present).toEqual(original);
    expect(redoHistory(undoHistory(history)).present).toEqual(painted);
  });

  it('keeps at least 50 steps, bounds memory and clears redo after a new edit', () => {
    let history = createHistory(TEST_PROJECT);
    for (let index = 0; index < 120; index += 1)
      history = commitHistory(history, {
        ...history.present,
        name: `Proyecto ${index}`,
      });
    expect(history.past).toHaveLength(100);
    for (let index = 0; index < 50; index += 1) history = undoHistory(history);
    expect(history.present.name).toBe('Proyecto 69');
    expect(history.future).toHaveLength(50);
    expect(
      commitHistory(history, { ...history.present, name: 'Otra edición' })
        .future,
    ).toEqual([]);
  });

  it('leaves empty undo, redo and unchanged strokes alone', () => {
    const history = createHistory(TEST_PROJECT);
    expect(undoHistory(history)).toBe(history);
    expect(redoHistory(history)).toBe(history);
    expect(commitHistory(history, TEST_PROJECT)).toBe(history);
    expect(paintStroke(TEST_PROJECT, [0], 0)).toBe(TEST_PROJECT);
  });

  it('interpolates horizontal, vertical and reversed diagonal lines with no gaps', () => {
    expect(linePoints({ col: 0, row: 0 }, { col: 3, row: 0 })).toEqual(
      [0, 1, 2, 3].map((col) => ({ col, row: 0 })),
    );
    expect(linePoints({ col: 0, row: 2 }, { col: 0, row: 0 })).toEqual(
      [2, 1, 0].map((row) => ({ col: 0, row })),
    );
    expect(linePoints({ col: 3, row: 3 }, { col: 0, row: 0 })).toEqual(
      [3, 2, 1, 0].map((col) => ({ col, row: col })),
    );
    expect(linePoints({ col: 0, row: 0 }, { col: 1, row: 3 })).toHaveLength(4);
    expect(() =>
      linePoints({ col: NaN, row: 0 }, { col: 1, row: 1 }),
    ).toThrow();
  });

  it('fills only connected cells without crossing diagonals or wrapping row edges', () => {
    const project = {
      ...TEST_PROJECT,
      cols: 3,
      rows: 3,
      cells: [0, 0, 1, 1, 0, 1, 0, 1, 0],
    };
    expect(floodFill(project, { col: 0, row: 0 }, 2).cells).toEqual([
      2, 2, 1, 1, 2, 1, 0, 1, 0,
    ]);
    expect(floodFill(project, { col: 0, row: 0 }, 0)).toBe(project);
    expect(() => floodFill(project, { col: 3, row: 0 }, 1)).toThrow();
    expect(() => floodFill(project, { col: 0, row: 0 }, 3)).toThrow();
  });

  it('fills a 200 by 200 region iteratively', () => {
    const project = {
      ...TEST_PROJECT,
      cols: 200,
      rows: 200,
      cells: Array<number>(40000).fill(0),
    };
    const result = floodFill(project, { col: 199, row: 199 }, 1);
    expect(result.cells.every((color) => color === 1)).toBe(true);
    expect(project.cells[0]).toBe(0);
  });

  it('normalizes selection rectangles in either direction', () => {
    expect(selectionBounds({ col: 3, row: 2 }, { col: 1, row: 0 })).toEqual({
      left: 1,
      bottom: 0,
      width: 3,
      height: 3,
    });
    expect(() =>
      selectionBounds({ col: 0.5, row: 0 }, { col: 1, row: 1 }),
    ).toThrow();
  });

  it('moves a rectangle with overlapping cells without losing colors', () => {
    const project = { ...TEST_PROJECT, cols: 4, rows: 1, cells: [1, 2, 0, 0] };
    const bounds = { left: 0, bottom: 0, width: 2, height: 1 };
    expect(moveSelection(project, bounds, 1, 0).project.cells).toEqual([
      0, 1, 2, 0,
    ]);
    expect(moveSelection(project, bounds, -1, 0)).toEqual({
      project,
      warning: 'La selección no cabe en esa posición; no se ha movido.',
    });
    expect(moveSelection(project, bounds, 0, 0).project).toBe(project);
    expect(() =>
      moveSelection(project, { ...bounds, width: 5 }, 0, 0),
    ).toThrow();
    expect(() => moveSelection(project, bounds, 0.1, 0)).toThrow();
  });

  it('deletes colors, replaces their cells with background and reindexes the palette', () => {
    expect(deleteColor(TEST_PROJECT, 'b').cells).toEqual([
      0, 0, 0, 1, 0, 0, 0, 1,
    ]);
    const project = { ...TEST_PROJECT, backgroundColorId: 'c' };
    expect(deleteColor(project, 'a').cells).toEqual([1, 1, 0, 1, 0, 1, 1, 1]);
    expect(() => deleteColor(TEST_PROJECT, 'a')).toThrow(/fondo/);
    expect(() => deleteColor(TEST_PROJECT, 'missing')).toThrow();
  });

  it('resizes anchored at the bottom left and asks before cropping colored cells', () => {
    const grown = resizeProject(TEST_PROJECT, 5, 3);
    expect(grown.project.cells).toEqual([
      0, 0, 1, 2, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0,
    ]);
    expect(grown.needsCrop).toBe(false);
    expect(resizeProject(TEST_PROJECT, 2, 1)).toEqual({
      project: TEST_PROJECT,
      needsCrop: true,
    });
    expect(resizeProject(TEST_PROJECT, 2, 1, true).project.cells).toEqual([
      0, 0,
    ]);
    expect(resizeProject(TEST_PROJECT, 4, 2).project).toBe(TEST_PROJECT);
    const empty = {
      ...TEST_PROJECT,
      cells: Array<number>(8).fill(0),
      progress: { row: 2, stitch: 4 },
    };
    expect(resizeProject(empty, 1, 1).project.progress).toEqual({
      row: 1,
      stitch: 2,
    });
    expect(() => resizeProject(TEST_PROJECT, 0, 1)).toThrow();
  });

  it.each([-1, 8, 0.5])('rejects invalid stroke indices: %s', (index) => {
    expect(() => paintStroke(TEST_PROJECT, [index], 1)).toThrow();
  });
  it('repositions a design when shrinking if its bounding rectangle still fits', () => {
    const project = {
      ...TEST_PROJECT,
      cols: 6,
      rows: 2,
      cells: [0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 1, 0],
    };
    const result = resizeProject(project, 3, 2);
    expect(result.needsCrop).toBe(false);
    expect(result.project.cells).toEqual([0, 1, 2, 0, 1, 0]);
  });
  it('rejects invalid stroke colors', () =>
    expect(() => paintStroke(TEST_PROJECT, [0], 3)).toThrow());
});
