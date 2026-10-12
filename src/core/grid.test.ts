import { describe, expect, it } from 'vitest';
import {
  centerDesign,
  createGrid,
  designBounds,
  moveDesign,
  readCell,
  writeCell,
} from './grid';
import type { Grid } from './types';

describe('grid', () => {
  it('creates a grid filled with any background palette index', () => {
    expect(createGrid(3, 2, 2)).toEqual({
      cols: 3,
      rows: 2,
      cells: [2, 2, 2, 2, 2, 2],
    });
  });

  it('reads and writes left-to-right from the bottom, immutably', () => {
    const grid = createGrid(3, 2, 0);
    Object.freeze(grid.cells);
    Object.freeze(grid);
    const edited = writeCell(grid, 2, 0, 1);
    const top = writeCell(edited, 0, 1, 2);
    expect(top.cells).toEqual([0, 0, 1, 2, 0, 0]);
    expect(readCell(top, 2, 0)).toBe(1);
    expect(readCell(top, 0, 1)).toBe(2);
    expect(grid.cells).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it.each([
    [-1, 0],
    [3, 0],
    [0, -1],
    [0, 2],
    [0.5, 0],
    [0, NaN],
  ])('rejects coordinates (%s, %s)', (col, row) => {
    const grid = createGrid(3, 2, 0);
    expect(() => readCell(grid, col, row)).toThrow(RangeError);
    expect(() => writeCell(grid, col, row, 1)).toThrow(RangeError);
  });

  it('rejects invalid background and color indices', () => {
    for (const color of [-1, 0.5, NaN, Infinity]) {
      expect(() => createGrid(2, 2, color)).toThrow(RangeError);
      expect(() => writeCell(createGrid(2, 2, 0), 0, 0, color)).toThrow(
        RangeError,
      );
      expect(() => designBounds(createGrid(2, 2, 0), color)).toThrow(
        RangeError,
      );
    }
  });

  it('bounds all non-background cells including holes and multiple colors', () => {
    const grid: Grid = {
      cols: 5,
      rows: 3,
      cells: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
    };
    expect(designBounds(grid, 0)).toEqual({
      left: 1,
      bottom: 0,
      width: 3,
      height: 3,
    });
  });

  it('moves only the design, preserves holes and colors, and clears its old position', () => {
    const grid: Grid = {
      cols: 5,
      rows: 3,
      cells: [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    const result = moveDesign(grid, 0, 1, 1);
    expect(result.moved).toBe(true);
    expect(result.warning).toBeNull();
    expect(result.grid.cells).toEqual([
      0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0,
    ]);
    expect(grid.cells.slice(0, 3)).toEqual([1, 0, 2]);
    expect(moveDesign(result.grid, 0, -1, -1).grid).toEqual(grid);
  });

  it.each([
    [5, 7, 8, false],
    [6, 7, 7, true],
  ])('centers width %s in 20 columns', (width, left, right, exact) => {
    let grid = createGrid(20, 4, 0);
    for (let col = 0; col < width; col += 1) grid = writeCell(grid, col, 0, 1);
    grid = writeCell(grid, 0, 1, 2);
    const result = centerDesign(grid, 0);
    expect(result.margins).toEqual({ left, right, bottom: 1, top: 1 });
    expect(result.exact).toBe(exact);
    expect(designBounds(result.grid, 0)).toEqual({
      left,
      bottom: 1,
      width,
      height: 2,
    });
    if (!exact) expect(result.warning).toContain('sobra un punto a la derecha');
    else expect(result.warning).toBeNull();
  });

  it('reports odd vertical margins with the extra row above', () => {
    const result = centerDesign(writeCell(createGrid(3, 4, 0), 0, 0, 1), 0);
    expect(result.margins).toEqual({ left: 1, right: 1, bottom: 1, top: 2 });
    expect(result.exact).toBe(false);
    expect(result.warning).toContain('sobra una fila arriba');
  });

  it('leaves oversized designs untouched and reports the failure', () => {
    const source = createGrid(6, 3, 1);
    const target = createGrid(5, 2, 0);
    const result = centerDesign(source, 0, target);
    expect(result.grid).toBe(source);
    expect(result.moved).toBe(false);
    expect(result.exact).toBe(false);
    expect(result.margins).toBeNull();
    expect(result.warning).toContain('no cabe');
    expect(target.cells.every((color) => color === 0)).toBe(true);
  });

  it('centers into a destination that fits', () => {
    const result = centerDesign(createGrid(2, 2, 1), 0, createGrid(6, 6, 0));
    expect(result.margins).toEqual({ left: 2, right: 2, bottom: 2, top: 2 });
    expect(designBounds(result.grid, 0)).toEqual({
      left: 2,
      bottom: 2,
      width: 2,
      height: 2,
    });
  });

  it.each([
    [-1, 0],
    [4, 0],
    [0, -1],
    [0, 4],
  ])('rejects a move outside the grid (%s, %s) without clipping', (dx, dy) => {
    const grid = writeCell(createGrid(4, 4, 0), 0, 0, 1);
    const result = moveDesign(grid, 0, dx, dy);
    expect(result.grid).toBe(grid);
    expect(result.moved).toBe(false);
    expect(result.warning).toContain('no cabe');
  });

  it('rejects fractional movement', () => {
    expect(() => moveDesign(createGrid(2, 2, 1), 0, 0.5, 0)).toThrow(
      RangeError,
    );
    expect(() => moveDesign(createGrid(2, 2, 1), 0, 0, NaN)).toThrow(
      RangeError,
    );
  });

  it('handles grids with no design and a design that fills the whole grid', () => {
    const empty = createGrid(2, 2, 0);
    expect(designBounds(empty, 0)).toBeNull();
    expect(centerDesign(empty, 0)).toEqual({
      grid: empty,
      moved: false,
      warning: null,
      margins: null,
      exact: true,
    });
    expect(moveDesign(empty, 0, 1, 1)).toEqual({
      grid: empty,
      moved: false,
      warning: null,
    });
    expect(centerDesign(createGrid(2, 2, 1), 0).margins).toEqual({
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
    });
  });
});
