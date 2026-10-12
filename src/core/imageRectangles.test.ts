import { describe, expect, it } from 'vitest';
import {
  cropPixels,
  detectMesh,
  inspectImageGrid,
  reduceColors,
  sampleMesh,
} from './imageImport';
import type { PixelImage, Rgba } from './imageImport';

const colors: Rgba[] = [
  [240, 220, 170, 255],
  [40, 55, 70, 255],
  [180, 60, 65, 255],
];
const cells = Array.from({ length: 40 * 36 }, (_, i) => {
  const x = i % 40;
  const y = Math.floor(i / 40);
  if (x < 2 || x > 37 || y < 2 || y > 33) return 0;
  if ((x + y) % 7 === 0 || (x > 8 && x < 31 && y > 10 && y < 27)) return 2;
  return (x + y) % 3 === 0 ? 1 : 0;
});

function drawing(width: number, height: number, line = 1): PixelImage {
  const data = new Uint8ClampedArray(40 * width * 36 * height * 4);
  for (let y = 0; y < 36 * height; y += 1) {
    for (let x = 0; x < 40 * width; x += 1) {
      const index = (35 - Math.floor(y / height)) * 40 + Math.floor(x / width);
      const color =
        x % width < line || y % height < line
          ? [70, 70, 70, 255]
          : colors[cells[index]!]!;
      data.set(color, (y * 40 * width + x) * 4);
    }
  }
  return { width: 40 * width, height: 36 * height, data };
}

// Exact area averaging simulates a screenshot reduced to fractional cell sizes.
function areaResize(
  image: PixelImage,
  width: number,
  height: number,
): PixelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const sx = image.width / width;
  const sy = image.height / height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sums = [0, 0, 0, 0];
      for (let iy = Math.floor(y * sy); iy < Math.ceil((y + 1) * sy); iy += 1) {
        const wy = Math.min(iy + 1, (y + 1) * sy) - Math.max(iy, y * sy);
        for (
          let ix = Math.floor(x * sx);
          ix < Math.ceil((x + 1) * sx);
          ix += 1
        ) {
          const wx = Math.min(ix + 1, (x + 1) * sx) - Math.max(ix, x * sx);
          for (let c = 0; c < 4; c += 1)
            sums[c]! += image.data[(iy * image.width + ix) * 4 + c]! * wx * wy;
        }
      }
      data.set(
        sums.map((v) => v / (sx * sy)),
        (y * width + x) * 4,
      );
    }
  }
  return { width, height, data };
}

function smoothUpscale(image: PixelImage, factor: number): PixelImage {
  const width = image.width * factor;
  const height = image.height * factor;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ox = (x + 0.5) / factor - 0.5;
      const oy = (y + 0.5) / factor - 0.5;
      const left = Math.floor(ox);
      const top = Math.floor(oy);
      for (let c = 0; c < 4; c += 1) {
        let value = 0;
        for (let dy = 0; dy < 2; dy += 1)
          for (let dx = 0; dx < 2; dx += 1) {
            const ix = Math.max(0, Math.min(image.width - 1, left + dx));
            const iy = Math.max(0, Math.min(image.height - 1, top + dy));
            const wx = dx ? ox - left : 1 - ox + left;
            const wy = dy ? oy - top : 1 - oy + top;
            value += image.data[(iy * image.width + ix) * 4 + c]! * wx * wy;
          }
        data[(y * width + x) * 4 + c] = value;
      }
    }
  }
  return { width, height, data };
}

const small = areaResize(drawing(20, 32, 2), 204, 295);
function mismatches(image: PixelImage): number {
  const mesh = detectMesh(image);
  expect(mesh?.cols).toBe(40);
  expect(mesh?.rows).toBe(36);
  const recovered = reduceColors(sampleMesh(image, mesh!), 40, 36, 3);
  // Palette labels are arbitrary; compare against the closest original RGB.
  const originalIndices = recovered.palette.map((entry) => {
    const rgb = [1, 3, 5].map((i) => parseInt(entry.hex.slice(i, i + 2), 16));
    return colors
      .map((color) => rgb.reduce((sum, v, c) => sum + (v - color[c]!) ** 2, 0))
      .reduce(
        (best, score, i, scores) => (score < scores[best]! ? i : best),
        0,
      );
  });
  return recovered.cells.filter(
    (color, i) => originalIndices[color] !== cells[i],
  ).length;
}

describe('rectangular screenshots and honest mesh detection', () => {
  for (const [width, height] of [
    [10, 16],
    [16, 10],
    [10, 25],
    [25, 10],
  ] as const)
    it(`recovers 40 by 36 cells sized ${width} by ${height}`, () => {
      expect(mismatches(drawing(width, height))).toBe(0);
    });
  it('recovers the small area-averaged screenshot after cropping numbered margins', () => {
    const width = small.width + 31;
    const height = small.height + 25;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    for (let y = 0; y < small.height; y += 1)
      data.set(
        small.data.subarray(y * small.width * 4, (y + 1) * small.width * 4),
        ((y + 11) * width + 13) * 4,
      );
    // Generated glyph-like marks lie outside the crop, as screenshot numbers do.
    for (let y = 1; y < 7; y += 1)
      for (let x = 13; x < width; x += 5)
        data.set([40, 40, 40, 255], (y * width + x) * 4);
    const cropped = cropPixels(
      { width, height, data },
      { x: 13, y: 11, width: small.width, height: small.height },
    );
    expect(mismatches(cropped)).toBeLessThanOrEqual(Math.floor(40 * 36 * 0.03));
    expect(inspectImageGrid(cropped).small).toBe(true);
  });
  it('recovers the smoothed fourfold enlargement instead of a tiny alias grid', () => {
    const image = smoothUpscale(small, 4);
    expect(mismatches(image)).toBeLessThanOrEqual(Math.floor(40 * 36 * 0.03));
    const mesh = detectMesh(image)!;
    expect(image.width / mesh.cols).toBeGreaterThan(20.4 / 3);
    expect(image.height / mesh.rows).toBeGreaterThan(32.8 / 3);
  });
  it('asks for counts when only one axis is periodic, including small images', () => {
    const data = new Uint8ClampedArray(400 * 288 * 4);
    for (let y = 0; y < 288; y += 1)
      for (let x = 0; x < 400; x += 1)
        data.set(
          [Math.floor(x / 10) % 2 ? 40 : 220, Math.floor(y / 2), 100, 255],
          (y * 400 + x) * 4,
        );
    const image = { width: 400, height: 288, data };
    expect(detectMesh(image)).toBeNull();
    expect(inspectImageGrid(image).kind).toBe('uncertain');
    const stripes = {
      width: 160,
      height: 144,
      data: new Uint8ClampedArray(160 * 144 * 4),
    };
    for (let i = 0; i < stripes.width * stripes.height; i += 1)
      stripes.data.set(
        Math.floor((i % stripes.width) / 4) % 2 ? colors[0]! : colors[1]!,
        i * 4,
      );
    expect(detectMesh(stripes)).toBeNull();
  });
  it('recomputes the other axis from a confirmed column count after failed detection', () => {
    // Every column is an irregular gradient; horizontal period is absent.
    const image = drawing(10, 16);
    for (let y = 0; y < image.height; y += 1)
      for (let x = 0; x < image.width; x += 1) {
        const i = (y * image.width + x) * 4;
        image.data[i] = Math.floor(x / 2);
        image.data[i + 1] = y % 16 === 0 ? 0 : 220;
        image.data[i + 2] = y % 16 === 0 ? 0 : 180;
      }
    expect(detectMesh(image)).toBeNull();
    const guided = inspectImageGrid(image, { cols: 40 });
    expect(guided.mesh?.cols).toBe(40);
    expect(guided.mesh?.rows).toBe(36);
    expect(() => inspectImageGrid(image, { cols: 0 })).toThrow();
    const reverse = inspectImageGrid(drawing(16, 10), { rows: 36 });
    expect(reverse.mesh?.cols).toBe(40);
    expect(reverse.mesh?.rows).toBe(36);
    expect(inspectImageGrid(drawing(10, 16), { cols: 39 }).mesh?.rows).toBe(36);
    expect(inspectImageGrid(image, { cols: 40, rows: 36 }).mesh?.cols).toBe(40);
  });
  it('does not invent a native pixel grid for a low-color image with one irregular axis', () => {
    const image = {
      width: 160,
      height: 144,
      data: new Uint8ClampedArray(160 * 144 * 4),
    };
    let state = 17;
    for (let y = 0; y < image.height; y += 1) {
      state = (state * 1664525 + 1013904223) >>> 0;
      for (let x = 0; x < image.width; x += 1)
        image.data.set(
          [
            Math.floor(x / 4) % 2 ? 30 : 220,
            (state >>> 24) % 2 ? 40 : 200,
            100,
            255,
          ],
          (y * image.width + x) * 4,
        );
    }
    expect(detectMesh(image)).toBeNull();
    expect(inspectImageGrid(image).kind).toBe('uncertain');
  });
  it('reserves the automatic photo path for a clearly smooth image', () => {
    const image = {
      width: 400,
      height: 300,
      data: new Uint8ClampedArray(400 * 300 * 4),
    };
    for (let i = 0; i < 400 * 300; i += 1)
      image.data.set(
        [Math.floor((i % 400) / 2), Math.floor(i / 400 / 2), 90, 255],
        i * 4,
      );
    expect(inspectImageGrid(image).kind).toBe('photo');
  });
});
