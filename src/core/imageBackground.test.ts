import { describe, expect, it } from 'vitest';
import {
  nameImageColors,
  previewDrawingOnBackground,
  proposeImageBackground,
} from './imageBackground';
import { designBounds } from './grid';
import { reduceColors, mergeDrawingColors } from './imageImport';
import type { ImportedDrawing, Rgba } from './imageImport';
import { planImagePlacement } from './imagePlacement';
import { TEST_PROJECT } from './testFixtures';

const figureCells = Array.from({ length: 36 * 36 }, (_, i) => {
  const x = i % 36;
  const y = Math.floor(i / 36);
  return x >= 3 && x < 33 && y >= 2 && y < 34 ? 1 : 0;
});
// Interior holes make the figure exactly the nearest whole-cell count to 70%.
for (let row = 10; row < 17; row += 1)
  for (let col = 12; col < 20; col += 1) {
    if (figureCells.filter((v) => v === 1).length > Math.round(36 * 36 * 0.7))
      figureCells[row * 36 + col] = 0;
  }
const palette = [
  { id: 'light', name: 'Blanco', hex: '#f4f4f4' },
  { id: 'dark', name: 'Negro', hex: '#222222' },
];
const figure: ImportedDrawing = {
  cols: 36,
  rows: 36,
  cells: figureCells,
  palette,
  background: 0,
};

describe('imported image background and names', () => {
  it('chooses the light contour despite a dark figure occupying 70% of the image', () => {
    expect(figureCells.filter((v) => v === 1)).toHaveLength(
      Math.round(36 * 36 * 0.7),
    );
    expect(proposeImageBackground(figure)).toBe(0);
    const samples = figureCells.map((v): Rgba =>
      v ? [34, 34, 34, 255] : [244, 244, 244, 255],
    );
    const imported = reduceColors(samples, 36, 36);
    expect(imported.palette[imported.background!]!.hex).toBe('#f4f4f4');
  });
  it('chooses the dark contour for a large light figure', () => {
    const samples = figureCells.map((v): Rgba =>
      v ? [244, 244, 244, 255] : [34, 34, 34, 255],
    );
    const imported = reduceColors(samples, 36, 36);
    expect(imported.palette[imported.background!]!.hex).toBe('#222222');
  });
  it('asks when a drawing touches all four sides and both contour and corners tie', () => {
    const cells = Array.from({ length: 36 * 36 }, (_, i) =>
      i % 36 < 18 ? 0 : 1,
    );
    const drawing = { ...figure, cells };
    expect(proposeImageBackground(drawing)).toBeNull();
    const samples = cells.map((v): Rgba =>
      v ? [34, 34, 34, 255] : [244, 244, 244, 255],
    );
    expect(reduceColors(samples, 36, 36).background).toBeNull();
    expect(() =>
      planImagePlacement(TEST_PROJECT, { ...drawing, background: null }),
    ).toThrow('Elige un color de fondo');
    expect(
      mergeDrawingColors({ ...drawing, background: null }, 1, 0).background,
    ).toBe(0);
  });
  it('uses corners when the perimeter is inconclusive, without counting corners twice', () => {
    const cells = [0, 1, 1, 0, 1, 1, 0, 1, 0];
    expect(proposeImageBackground({ cols: 3, rows: 3, cells })).toBe(0);
    expect(proposeImageBackground({ cols: 1, rows: 1, cells: [2] })).toBe(2);
    expect(
      proposeImageBackground({ cols: 1, rows: 4, cells: [0, 1, 1, 0] }),
    ).toBe(0);
    expect(
      proposeImageBackground({ cols: 4, rows: 1, cells: [0, 1, 1, 0] }),
    ).toBe(0);
    expect(
      proposeImageBackground({ cols: 1, rows: 2, cells: [0, 1] }),
    ).toBeNull();
    expect(proposeImageBackground({ cols: 2, rows: 1, cells: [0, 1] }, 0)).toBe(
      0,
    );
    expect(() => proposeImageBackground(figure, 9)).toThrow();
    expect(() => proposeImageBackground(figure, -1)).toThrow();
  });
  it('reports only the 30 by 32 figure and the centered piece margins', () => {
    expect(designBounds(figure, 0)).toEqual({
      left: 3,
      bottom: 2,
      width: 30,
      height: 32,
    });
    const project = {
      ...TEST_PROJECT,
      cols: 64,
      rows: 72,
      palette,
      backgroundColorId: 'light',
      cells: Array<number>(64 * 72).fill(0),
    };
    const result = planImagePlacement(project, figure);
    expect(result.centering.margins).toEqual({
      left: 17,
      right: 17,
      bottom: 20,
      top: 20,
    });
    expect(result.project?.cells.filter((v) => v === 1)).toHaveLength(
      Math.round(36 * 36 * 0.7),
    );
  });
  it('shows the figure on a larger background-filled piece and reflects a wrong choice', () => {
    const preview = previewDrawingOnBackground(figure, 4);
    expect(preview.cols).toBe(44);
    expect(preview.rows).toBe(44);
    expect(preview.cells[0]).toBe(0);
    expect(designBounds(preview, 0)).toEqual({
      left: 7,
      bottom: 6,
      width: 30,
      height: 32,
    });
    const wrong = previewDrawingOnBackground({ ...figure, background: 1 }, 4);
    expect(wrong.cells[0]).toBe(1);
    expect(designBounds(wrong, 1)?.width).toBe(36);
    expect(previewDrawingOnBackground(figure).cols).toBe(48);
    expect(
      previewDrawingOnBackground(
        { ...figure, cells: Array<number>(1296).fill(0) },
        4,
      ).cells.every((v) => v === 0),
    ).toBe(true);
    expect(() =>
      previewDrawingOnBackground({ ...figure, background: null }),
    ).toThrow();
    expect(() => previewDrawingOnBackground(figure, -1)).toThrow();
    expect(() => previewDrawingOnBackground(figure, 1.5)).toThrow();
  });
  it('names the requested tones and keeps names editable separately from their ids', () => {
    const colors = ['#222222', '#f4f4f4', '#b44146', '#2d4155'];
    expect(
      nameImageColors(
        colors.map((hex, i) => ({ id: String(i), name: 'Old', hex })),
      ).map((p) => p.name),
    ).toEqual(['Negro', 'Blanco', 'Rojo', 'Azul']);
    expect(
      nameImageColors([
        { id: 'x', name: '', hex: '#888888' },
        { id: 'y', name: '', hex: '#ff8800' },
        { id: 'z', name: '', hex: '#ffff00' },
        { id: 'g', name: '', hex: '#008000' },
        { id: 'p', name: '', hex: '#800080' },
        { id: 'r', name: '', hex: '#ff80c0' },
        { id: 'b', name: '', hex: '#8b4513' },
        { id: 'be', name: '', hex: '#d6b68c' },
      ]).map((p) => p.name),
    ).toEqual([
      'Gris',
      'Naranja',
      'Amarillo',
      'Verde',
      'Morado',
      'Rosa',
      'Marrón',
      'Beige',
    ]);
    const named = nameImageColors([
      { id: 'light', name: '', hex: '#ff3333' },
      { id: 'dark', name: '', hex: '#661111' },
    ]);
    expect(named.map((p) => p.name)).toEqual(['Rojo claro', 'Rojo oscuro']);
    expect(named.map((p) => p.id)).toEqual(['light', 'dark']);
    expect(nameImageColors([])).toEqual([]);
    expect(() =>
      nameImageColors([{ id: 'x', name: '', hex: 'red' }]),
    ).toThrow();
  });
});
