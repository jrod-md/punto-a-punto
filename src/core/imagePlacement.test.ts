import { describe, expect, it } from 'vitest';
import { commitHistory, createHistory, undoHistory } from './editor';
import { fitDrawingWidth, planImagePlacement } from './imagePlacement';
import type { ImportedDrawing } from './imageImport';
import { TEST_PROJECT } from './testFixtures';

const drawing: ImportedDrawing = {
  cols: 30,
  rows: 2,
  cells: Array.from({ length: 60 }, (_, i) => (i < 30 ? 1 : 0)),
  palette: [
    { id: 'bg', name: 'Fondo', hex: '#ffffff' },
    { id: 'fg', name: 'Rojo', hex: '#fa3045' },
  ],
  background: 0,
};
const piece = {
  ...TEST_PROJECT,
  cols: 20,
  rows: 20,
  cells: Array<number>(400).fill(0),
};
describe('image placement', () => {
  it('rejects a 30-point design in a 20-point piece and returns the minimum growth', () => {
    const result = planImagePlacement(piece, drawing);
    expect(result.project).toBeNull();
    expect(result.problem).toBe('size');
    expect(result.minimumCols).toBe(30);
    expect(result.minimumRows).toBe(20);
    expect(piece.cells.every((v) => v === 0)).toBe(true);
    expect(planImagePlacement(piece, drawing, {}, true).project?.cols).toBe(30);
  });
  it('centers, preserves the existing drawing, appends colors and undoes in one step', () => {
    const original = {
      ...piece,
      cols: 40,
      cells: Array<number>(800)
        .fill(0)
        .map((v, i) => (i === 0 ? 1 : v)),
    };
    const result = planImagePlacement(original, drawing);
    expect(result.centering.margins).toEqual({
      left: 5,
      right: 5,
      bottom: 9,
      top: 10,
    });
    expect(result.project?.cells[0]).toBe(1);
    expect(result.project?.palette.at(-1)?.hex).toBe('#fa3045');
    expect(result.project?.cells.slice(9 * 40 + 5, 9 * 40 + 35)).toEqual(
      Array<number>(30).fill(original.palette.length),
    );
    const history = commitHistory(createHistory(original), result.project!);
    expect(history.past).toHaveLength(1);
    expect(undoHistory(history).present).toEqual(original);
  });
  it('requires merging when the combined palette exceeds twelve', () => {
    const full = {
      ...piece,
      cols: 40,
      cells: Array<number>(800).fill(0),
      palette: Array.from({ length: 12 }, (_, i) => ({
        id: `p${i}`,
        name: `Color ${i}`,
        hex: `#${i.toString(16).padStart(6, '0')}`,
      })),
      backgroundColorId: 'p0',
    };
    expect(planImagePlacement(full, drawing).problem).toBe('palette');
    const result = planImagePlacement(full, drawing, { 1: 'p5' });
    expect(result.paletteSize).toBe(12);
    expect(result.project?.cells.filter((v) => v === 5)).toHaveLength(30);
    expect(() => planImagePlacement(full, drawing, { 1: 'absent' })).toThrow();
  });
  it('reuses identical colors and handles a blank import', () => {
    const matching = {
      ...piece,
      cols: 40,
      cells: Array<number>(800).fill(0),
      palette: [...piece.palette, { id: 'red', name: 'Rojo', hex: '#fa3045' }],
    };
    expect(planImagePlacement(matching, drawing).paletteSize).toBe(
      matching.palette.length,
    );
    const blank = { ...drawing, cells: Array<number>(60).fill(0) };
    expect(planImagePlacement(piece, blank).problem).toBeNull();
    expect(
      planImagePlacement(piece, drawing, { 1: piece.backgroundColorId })
        .centering.margins,
    ).toBeNull();
    expect(() =>
      planImagePlacement(piece, { ...drawing, background: 8 }),
    ).toThrow();
  });
  it('checks fit margins and invalid point dimensions', () => {
    expect(fitDrawingWidth(64, 72, 4)).toBe(56);
    expect(() => fitDrawingWidth(20, 30, 10)).toThrow();
    expect(() => fitDrawingWidth(20, 30, -1)).toThrow();
    expect(() => fitDrawingWidth(20, 30, 1.5)).toThrow();
    expect(() => fitDrawingWidth(0, 30, 0)).toThrow();
  });
});
