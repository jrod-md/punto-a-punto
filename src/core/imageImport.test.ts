import { describe, expect, it } from 'vitest';
import {
  countDrawingColors,
  cropPixels,
  detectMesh,
  emptyBorderCrop,
  manualMesh,
  mergeDrawingColors,
  photoMesh,
  reduceColors,
  rotatePixels,
  sampleMesh,
  scaleDrawing,
  validatePixels,
} from './imageImport';
import type { PixelImage, Rgba } from './imageImport';

const colors: Rgba[] = [
  [240, 220, 170, 255],
  [45, 65, 85, 255],
  [180, 65, 70, 255],
];
const cells = Array.from({ length: 20 * 24 }, (_, i) => {
  const x = i % 20;
  const y = Math.floor(i / 20);
  return (x + Math.floor(y / 3)) % 3;
});
function fixture(
  period = 16,
  line = 0,
  noise = false,
  ox = 0,
  oy = 0,
  sparse = false,
): PixelImage {
  const width = Math.ceil(20 * period + ox);
  const height = Math.ceil(24 * period + oy);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const col = Math.min(19, Math.max(0, Math.floor((x - ox) / period)));
      const row = 23 - Math.min(23, Math.max(0, Math.floor((y - oy) / period)));
      const color = sparse
        ? col === 1 && row > 2 && row < 22
          ? 1
          : col === 18 && row === 1
            ? 2
            : 0
        : cells[row * 20 + col]!;
      const onLine =
        (x - ox + period) % period < line || (y - oy + period) % period < line;
      const p = onLine ? [0, 0, 0, 255] : colors[color]!;
      const delta = noise ? ((x * 13 + y * 7) % 9) - 4 : 0;
      data.set(
        [p[0]! + delta, p[1]! + delta, p[2]! + delta, 255],
        (y * width + x) * 4,
      );
    }
  }
  return { width, height, data };
}
function recovered(image: PixelImage) {
  const mesh = detectMesh(image);
  expect(mesh).not.toBeNull();
  expect(mesh?.cols).toBe(20);
  expect(mesh?.rows).toBe(24);
  return reduceColors(sampleMesh(image, mesh!), mesh!.cols, mesh!.rows);
}
describe('local image import', () => {
  it('imports native pixel art without inventing larger cells', () => {
    const image = fixture(1);
    const mesh = detectMesh(image);
    expect(mesh?.cols).toBe(20);
    expect(mesh?.rows).toBe(24);
    expect(reduceColors(sampleMesh(image, mesh!), 20, 24).cells).toEqual(cells);
  });
  it('reduces a palette to the chosen limit without losing transparent background', () => {
    const samples: Rgba[] = [
      [0, 0, 0, 0],
      [30, 20, 10, 255],
      [240, 230, 220, 255],
      [160, 80, 130, 255],
    ];
    const drawing = reduceColors(samples, 2, 2, 2);
    expect(drawing.palette).toHaveLength(2);
    expect(drawing.cells[0]).toBe(drawing.background);
    expect(drawing.transparent).toEqual([true, false, false, false]);
    expect(scaleDrawing(drawing, 4).transparent?.filter(Boolean)).toHaveLength(
      4,
    );
    expect(countDrawingColors(drawing, 2).reduce((a, b) => a + b, 0)).toBe(4);
  });
  for (const [name, image] of [
    ['clean blocks', fixture()],
    ['one-pixel lines', fixture(16, 1)],
    ['two-pixel lines', fixture(16, 2)],
    ['JPEG-like noise', fixture(16, 0, true)],
    [
      'fractional cells with independent phase',
      fixture(10.24, 0, false, 2.2, 3.6),
    ],
  ] as const) {
    it(`recovers every cell: ${name}`, () => {
      const drawing = recovered(image);
      expect(drawing.palette).toHaveLength(3);
      expect(drawing.cells).toEqual(cells);
    });
  }
  it('crops irregular white margins without shifting the recovered cells', () => {
    const inner = fixture();
    const width = inner.width + 37;
    const height = inner.height + 29;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < inner.height; y += 1)
      data.set(
        inner.data.subarray(y * inner.width * 4, (y + 1) * inner.width * 4),
        ((y + 9) * width + 11) * 4,
      );
    const image = { width, height, data };
    const crop = emptyBorderCrop(image);
    expect(crop).toEqual({
      x: 11,
      y: 9,
      width: inner.width,
      height: inner.height,
    });
    expect(recovered(cropPixels(image, crop)).cells).toEqual(cells);
  });
  it('does not double the period of a mostly solid drawing', () => {
    const image = fixture(16, 0, false, 0, 0, true);
    const drawing = recovered(image);
    expect(drawing.cells.map((v) => drawing.palette[v]!.hex)).toEqual(
      Array.from({ length: 480 }, (_, i) => {
        const x = i % 20;
        const y = Math.floor(i / 20);
        const color =
          x === 1 && y > 2 && y < 22 ? 1 : x === 18 && y === 1 ? 2 : 0;
        return (
          '#' +
          colors[color]!.slice(0, 3)
            .map((v) => v.toString(16).padStart(2, '0'))
            .join('')
        );
      }),
    );
  });
  it('preserves the woven photo aspect with 51 rows', () => {
    const image = {
      width: 400,
      height: 300,
      data: new Uint8ClampedArray(400 * 300 * 4),
    };
    const mesh = photoMesh(image, 60, 0.625, 0.556);
    expect(mesh.rows).toBe(51);
    expect((mesh.cols * 0.625) / (mesh.rows * 0.556)).toBeCloseTo(4 / 3, 1);
  });
  it('recognizes a smooth gradient as non pixel art', () => {
    const data = new Uint8ClampedArray(400 * 300 * 4);
    for (let i = 0; i < 400 * 300; i += 1)
      data.set(
        [Math.floor((i % 400) / 2), Math.floor(i / 400 / 2), 100, 255],
        i * 4,
      );
    expect(detectMesh({ width: 400, height: 300, data })).toBeNull();
  });
  it('counts every stitch, including the transparent background', () => {
    const image = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        0, 0, 0, 0, 20, 40, 60, 255, 0, 0, 0, 127, 20, 40, 60, 255,
      ]),
    };
    const drawing = reduceColors(
      sampleMesh(image, manualMesh(image, 2, 2)),
      2,
      2,
    );
    expect(drawing.background).toBe(0);
    expect(countDrawingColors(drawing, drawing.palette.length)).toEqual([2, 2]);
    expect(
      countDrawingColors(recovered(fixture()), 3).reduce((a, b) => a + b, 0),
    ).toBe(480);
  });
  it('replicates each cell as an exact 2 by 2 block', () => {
    const original = recovered(fixture());
    const twice = scaleDrawing(original, 40);
    expect(twice.rows).toBe(48);
    for (let row = 0; row < 48; row += 1)
      for (let col = 0; col < 40; col += 1)
        expect(twice.cells[row * 40 + col]).toBe(
          original.cells[Math.floor(row / 2) * 20 + Math.floor(col / 2)],
        );
  });
  it('merges colors and remaps the background; rejects invalid merges', () => {
    const original = recovered(fixture());
    const merged = mergeDrawingColors(original, 0, 1);
    expect(merged.palette).toHaveLength(2);
    expect(merged.background).toBe(0);
    expect(merged.cells).toEqual(original.cells.map((v) => (v === 2 ? 1 : 0)));
    expect(() => mergeDrawingColors(original, 0, 0)).toThrow();
  });
  it('rotates clockwise four times without changing any pixels', () => {
    const image = fixture();
    expect(rotatePixels(image).width).toBe(image.height);
    expect(
      rotatePixels(rotatePixels(rotatePixels(rotatePixels(image)))),
    ).toEqual(image);
  });
  it('validates malformed dimensions, crop, mesh, colors, scales and samples', () => {
    const image = fixture();
    expect(() => validatePixels({ ...image, width: 0 })).toThrow();
    expect(() =>
      cropPixels(image, { x: -1, y: 0, width: 1, height: 1 }),
    ).toThrow();
    expect(() => manualMesh(image, 0, 1)).toThrow();
    expect(() =>
      sampleMesh(image, { cols: 1, rows: 1, x: [], y: [] }),
    ).toThrow();
    expect(() => reduceColors([], 1, 1)).toThrow();
    expect(() => reduceColors([colors[0]!], 1, 1, 13)).toThrow();
    expect(() => photoMesh(image, 60, 0, 1)).toThrow();
    expect(() => scaleDrawing(recovered(image), 0)).toThrow();
    expect(() =>
      countDrawingColors({ cols: 1, rows: 1, cells: [2] }, 2),
    ).toThrow();
    expect(() =>
      countDrawingColors({ cols: 2, rows: 1, cells: [0] }, 2),
    ).toThrow();
    const blank = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray(16).fill(255),
    };
    expect(emptyBorderCrop(blank)).toEqual({ x: 0, y: 0, width: 2, height: 2 });
    expect(detectMesh(blank)).toBeNull();
  });
});
