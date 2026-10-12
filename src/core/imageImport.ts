import type { Grid, PaletteColor } from './types';
import { validateEditorSize } from './projectFile';
import { nameImageColors, proposeImageBackground } from './imageBackground';

export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface ImageMesh {
  cols: number;
  rows: number;
  x: number[];
  y: number[];
}
export interface GridHint {
  cols?: number;
  rows?: number;
}
export interface GridInspection {
  mesh: ImageMesh | null;
  kind: 'grid' | 'uncertain' | 'photo';
  small: boolean;
}
export interface ImportedDrawing extends Grid {
  palette: PaletteColor[];
  background: number | null;
  transparent?: readonly boolean[];
}
export type Rgba = readonly [number, number, number, number];

export function validatePixels(image: PixelImage): void {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width < 1 ||
    image.height < 1 ||
    image.data.length !== image.width * image.height * 4
  )
    throw new RangeError('La imagen no tiene dimensiones válidas.');
}

export function cropPixels(image: PixelImage, crop: Crop): PixelImage {
  validatePixels(image);
  if (
    ![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width < 1 ||
    crop.height < 1 ||
    crop.x + crop.width > image.width ||
    crop.y + crop.height > image.height
  )
    throw new RangeError('El recorte está fuera de la imagen.');
  const data = new Uint8ClampedArray(crop.width * crop.height * 4);
  for (let y = 0; y < crop.height; y += 1) {
    const start = ((crop.y + y) * image.width + crop.x) * 4;
    data.set(
      image.data.subarray(start, start + crop.width * 4),
      y * crop.width * 4,
    );
  }
  return { width: crop.width, height: crop.height, data };
}

export function rotatePixels(image: PixelImage): PixelImage {
  validatePixels(image);
  const data = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const destination = (x * image.height + image.height - 1 - y) * 4;
      data.set(
        image.data.subarray(
          (y * image.width + x) * 4,
          (y * image.width + x + 1) * 4,
        ),
        destination,
      );
    }
  }
  return { width: image.height, height: image.width, data };
}

// Only wholly empty outer strips are removed; interior background is retained.
export function emptyBorderCrop(image: PixelImage): Crop {
  validatePixels(image);
  let left = image.width;
  let right = -1;
  let top = image.height;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const i = (y * image.width + x) * 4;
      const empty =
        image.data[i + 3]! < 128 ||
        (image.data[i]! > 246 &&
          image.data[i + 1]! > 246 &&
          image.data[i + 2]! > 246);
      if (empty) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return right < 0
    ? { x: 0, y: 0, width: image.width, height: image.height }
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

function pixel(image: PixelImage, x: number, y: number): Rgba {
  const i =
    (Math.min(image.height - 1, Math.max(0, Math.floor(y))) * image.width +
      Math.min(image.width - 1, Math.max(0, Math.floor(x)))) *
    4;
  return [
    image.data[i]!,
    image.data[i + 1]!,
    image.data[i + 2]!,
    image.data[i + 3]!,
  ];
}

function distance(a: Rgba, b: Rgba): number {
  return (
    Math.abs((a[0] * a[3]) / 255 - (b[0] * b[3]) / 255) +
    Math.abs((a[1] * a[3]) / 255 - (b[1] * b[3]) / 255) +
    Math.abs((a[2] * a[3]) / 255 - (b[2] * b[3]) / 255) +
    Math.abs(a[3] - b[3])
  );
}

function profiles(image: PixelImage): [number[], number[]] {
  const horizontal = Array<number>(image.width).fill(0);
  const vertical = Array<number>(image.height).fill(0);
  const stride = Math.max(
    1,
    Math.floor(Math.min(image.width, image.height) / 160),
  );
  for (let y = 0; y < image.height; y += stride) {
    for (let x = 1; x < image.width; x += 1) {
      const delta = distance(pixel(image, x, y), pixel(image, x - 1, y));
      if (delta > 36) horizontal[x]! += delta;
    }
  }
  for (let x = 0; x < image.width; x += stride) {
    for (let y = 1; y < image.height; y += 1) {
      const delta = distance(pixel(image, x, y), pixel(image, x, y - 1));
      if (delta > 36) vertical[y]! += delta;
    }
  }
  return [horizontal, vertical];
}

function peaks(profile: number[]): number[] {
  const threshold = Math.max(...profile) * 0.12;
  if (!threshold) return [];
  const result: number[] = [];
  let sum = 0;
  let weight = 0;
  let last = -10;
  for (let i = 1; i < profile.length; i += 1) {
    if (profile[i]! <= threshold) continue;
    if (i - last > 3 && weight) {
      result.push(sum / weight);
      sum = 0;
      weight = 0;
    }
    sum += i * profile[i]!;
    weight += profile[i]!;
    last = i;
  }
  if (weight) result.push(sum / weight);
  return result;
}

function periodicity(profile: number[], period: number): number {
  const angle = (2 * Math.PI) / period;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  let x = 1;
  let y = 0;
  let real = 0;
  let imaginary = 0;
  let total = 0;
  for (const weight of profile) {
    real += weight * x;
    imaginary += weight * y;
    total += weight;
    const next = x * cosine - y * sine;
    y = x * sine + y * cosine;
    x = next;
  }
  return total ? Math.hypot(real, imaginary) / total : 0;
}

function periods(profile: number[], boundaries: number[]): number[] {
  const gaps = boundaries.slice(1).map((v, i) => v - boundaries[i]!);
  if (boundaries.length < 2) return [];
  const sorted = [...gaps].sort((a, b) => a - b);
  const small = sorted.filter((v) => v <= sorted[0]! * 1.4);
  const candidates = [small[Math.floor(small.length / 2)]!];
  // Phase coherence measures whether edge energy really repeats at this period.
  // Sharp combs have equal harmonics; keep the coarsest strong fundamental.
  let bestPeriod = 0;
  let bestScore = 0;
  const size = profile.length;
  for (
    let cycles = Math.max(3, size / 160);
    cycles <= size / 4;
    cycles += 0.25
  ) {
    const period = size / cycles;
    const score = periodicity(profile, period);
    if (
      score > bestScore + 0.03 ||
      (score >= bestScore - 0.015 && period > bestPeriod)
    ) {
      bestPeriod = period;
      bestScore = score;
    }
  }
  if (bestScore >= 0.55) {
    let period = bestPeriod;
    let score = periodicity(profile, period);
    for (const radius of [0.25, 0.04, 0.008]) {
      const cycles = size / period;
      for (let shift = -4; shift <= 4; shift += 1) {
        const candidate = size / (cycles + (shift * radius) / 4);
        const value = periodicity(profile, candidate);
        if (value > score) {
          period = candidate;
          score = value;
        }
      }
    }
    candidates.push(period);
  }
  return candidates.filter((v) => v >= 4 && periodicity(profile, v) >= 0.55);
}

function axisLines(
  size: number,
  boundaries: number[],
  period: number,
): { lines: number[]; error: number } {
  const anchor = boundaries[0] ?? 0;
  const indices = boundaries.map((v) => Math.round((v - anchor) / period));
  const meanN =
    indices.reduce((a, b) => a + b, 0) / Math.max(1, indices.length);
  const meanX =
    boundaries.reduce((a, b) => a + b, 0) / Math.max(1, boundaries.length);
  let numerator = 0;
  let denominator = 0;
  boundaries.forEach((v, i) => {
    numerator += (indices[i]! - meanN) * (v - meanX);
    denominator += (indices[i]! - meanN) ** 2;
  });
  const fitted = denominator ? numerator / denominator : period;
  if (Math.abs(fitted - period) < period * 0.12) period = fitted;
  const offset = boundaries.length ? meanX - meanN * period : 0;
  const error =
    boundaries.reduce(
      (sum, v, i) =>
        sum + Math.abs(v - (offset + indices[i]! * period)) / period,
      0,
    ) / Math.max(1, boundaries.length);
  const first = Math.ceil(-offset / period - 0.5);
  const last = Math.ceil((size - offset) / period - 0.5);
  const lines = Array.from(
    { length: Math.max(2, last - first + 1) },
    (_, i) => offset + (first + i) * period,
  );
  // Snap the uniform mesh to a nearby measured edge, including fractional cells.
  return {
    error,
    lines: lines.map((line) => {
      const closest = boundaries.reduce(
        (best, v) => (Math.abs(v - line) < Math.abs(best - line) ? v : best),
        line + period,
      );
      return Math.abs(closest - line) < Math.min(2, period * 0.16)
        ? closest
        : line;
    }),
  };
}

function uniformity(
  image: PixelImage,
  x: number[],
  y: number[],
  confirmedX = false,
  confirmedY = false,
): number {
  let score = 0;
  let count = 0;
  const strideX = Math.max(1, Math.floor((x.length - 1) / 30));
  const strideY = Math.max(1, Math.floor((y.length - 1) / 30));
  for (let row = 0; row < y.length - 1; row += strideY) {
    for (let col = 0; col < x.length - 1; col += strideX) {
      const center = pixel(
        image,
        (x[col]! + x[col + 1]!) / 2,
        (y[row]! + y[row + 1]!) / 2,
      );
      for (const fy of confirmedY ? [0.5] : [0.24, 0.5, 0.76]) {
        for (const fx of confirmedX ? [0.5] : [0.24, 0.5, 0.76]) {
          score += distance(
            center,
            pixel(
              image,
              x[col]! + (x[col + 1]! - x[col]!) * fx,
              y[row]! + (y[row + 1]! - y[row]!) * fy,
            ),
          );
          count += 1;
        }
      }
    }
  }
  return score / Math.max(1, count);
}

export function manualMesh(
  image: PixelImage,
  cols: number,
  rows: number,
): ImageMesh {
  validatePixels(image);
  validateEditorSize(cols, rows);
  return {
    cols,
    rows,
    x: Array.from({ length: cols + 1 }, (_, i) => (i * image.width) / cols),
    y: Array.from({ length: rows + 1 }, (_, i) => (i * image.height) / rows),
  };
}

export function inspectImageGrid(
  image: PixelImage,
  hint: GridHint = {},
): GridInspection {
  validatePixels(image);
  if (hint.cols !== undefined) validateEditorSize(hint.cols, 1);
  if (hint.rows !== undefined) validateEditorSize(1, hint.rows);
  const [px, py] = profiles(image);
  const bx = peaks(px);
  const by = peaks(py);
  const cx = periods(px, bx);
  const cy = periods(py, by);
  // Other-axis periods are harmonic hints for missing edges, never substitutes
  // for independent periodicity and phase checks on the axis being detected.
  const hintedX =
    hint.cols === undefined ? null : manualMesh(image, hint.cols, 1).x;
  const hintedY =
    hint.rows === undefined ? null : manualMesh(image, 1, hint.rows).y;
  const xCandidates = hintedX
    ? [image.width / hint.cols!]
    : [...new Set([...cx, ...cy])];
  const yCandidates = hintedY
    ? [image.height / hint.rows!]
    : [...new Set([...cy, ...cx])];
  let best: { mesh: ImageMesh; score: number; area: number } | null = null;
  for (const sx of xCandidates) {
    if (!hintedX && (bx.length < 2 || periodicity(px, sx) < 0.55)) continue;
    for (const sy of yCandidates) {
      if (!hintedY && (by.length < 2 || periodicity(py, sy) < 0.55)) continue;
      if (Math.max(sx, sy) / Math.min(sx, sy) > 2.51) continue;
      const fitX = hintedX
        ? { lines: hintedX, error: 0 }
        : axisLines(image.width, bx, sx);
      const fitY = hintedY
        ? { lines: hintedY, error: 0 }
        : axisLines(image.height, by, sy);
      const x = fitX.lines;
      const y = fitY.lines;
      if (x.length < 2 || y.length < 2 || x.length > 1001 || y.length > 1001)
        continue;
      const fittedX = (x.at(-1)! - x[0]!) / (x.length - 1);
      const fittedY = (y.at(-1)! - y[0]!) / (y.length - 1);
      if (
        (!hintedX && periodicity(px, fittedX) < 0.55) ||
        (!hintedY && periodicity(py, fittedY) < 0.55)
      )
        continue;
      const score =
        uniformity(image, x, y, Boolean(hintedX), Boolean(hintedY)) +
        50 * (fitX.error + fitY.error);
      const area = sx * sy;
      if (
        score < 16 &&
        (!best ||
          score < best.score - 0.05 ||
          (score <= best.score + 0.05 && area > best.area))
      )
        best = {
          mesh: { cols: x.length - 1, rows: y.length - 1, x, y },
          score,
          area,
        };
    }
  }
  if (best)
    return {
      mesh: best.mesh,
      kind: 'grid',
      small:
        Math.min(image.width / best.mesh.cols, image.height / best.mesh.rows) <
        6,
    };
  if (
    !hint.cols &&
    !hint.rows &&
    cx.length === 0 &&
    cy.length === 0 &&
    image.width <= 200 &&
    image.height <= 200 &&
    px.some((v) => v > 0) &&
    py.some((v) => v > 0)
  ) {
    const nativeColors = new Set<string>();
    for (let i = 0; i < image.data.length; i += 4) {
      nativeColors.add(Array.from(image.data.subarray(i, i + 4)).join(','));
      if (nativeColors.size > 12) break;
    }
    if (nativeColors.size >= 2 && nativeColors.size <= 12)
      return {
        mesh: manualMesh(image, image.width, image.height),
        kind: 'grid',
        small: true,
      };
  }
  return {
    mesh: null,
    kind:
      px.every((v) => v === 0) && py.every((v) => v === 0)
        ? 'photo'
        : 'uncertain',
    small: false,
  };
}

export function detectMesh(image: PixelImage): ImageMesh | null {
  return inspectImageGrid(image).mesh;
}

// Two offset histograms keep JPEG noise around a bin boundary in one cluster.
function dominant(samples: Rgba[]): Rgba {
  const transparent = samples.filter((p) => p[3] < 128).length;
  if (transparent > samples.length / 2) return [255, 255, 255, 0];
  let winner: Rgba[] = [];
  for (const offset of [0, 12]) {
    const bins = new Map<string, Rgba[]>();
    for (const p of samples) {
      if (p[3] < 128) continue;
      const key = p
        .slice(0, 3)
        .map((v) => Math.floor((v + offset) / 24))
        .join(',');
      const bin = bins.get(key) ?? [];
      bin.push(p);
      bins.set(key, bin);
      if (bin.length > winner.length) winner = bin;
    }
  }
  const channels = [0, 1, 2].map((channel) => {
    const values = winner.map((p) => p[channel]!).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 255;
  });
  return [channels[0]!, channels[1]!, channels[2]!, 255];
}

export function sampleMesh(image: PixelImage, mesh: ImageMesh): Rgba[] {
  validatePixels(image);
  validateEditorSize(mesh.cols, mesh.rows);
  if (mesh.x.length !== mesh.cols + 1 || mesh.y.length !== mesh.rows + 1)
    throw new RangeError('La rejilla no coincide con sus dimensiones.');
  const result: Rgba[] = [];
  for (let row = mesh.rows - 1; row >= 0; row -= 1) {
    for (let col = 0; col < mesh.cols; col += 1) {
      const samples: Rgba[] = [];
      for (let sy = 0; sy < 7; sy += 1) {
        for (let sx = 0; sx < 7; sx += 1)
          samples.push(
            pixel(
              image,
              mesh.x[col]! +
                (mesh.x[col + 1]! - mesh.x[col]!) * (0.25 + sx / 12),
              mesh.y[row]! +
                (mesh.y[row + 1]! - mesh.y[row]!) * (0.25 + sy / 12),
            ),
          );
      }
      result.push(dominant(samples));
    }
  }
  return result;
}

export function reduceColors(
  samples: readonly Rgba[],
  cols: number,
  rows: number,
  maximum = 12,
): ImportedDrawing {
  validateEditorSize(cols, rows);
  if (
    samples.length !== cols * rows ||
    !Number.isInteger(maximum) ||
    maximum < 2 ||
    maximum > 12
  )
    throw new RangeError('Revisa el número de cuadros y colores (2 a 12).');
  const bins = new Map<
    string,
    { color: Rgba; count: number; members: number[] }
  >();
  samples.forEach((color, index) => {
    const key =
      color[3] < 128
        ? 'transparent'
        : color
            .slice(0, 3)
            .map((v) => Math.floor(v / 32))
            .join(',');
    const match = bins.get(key);
    if (match) {
      match.count += 1;
      match.members.push(index);
    } else bins.set(key, { color, count: 1, members: [index] });
  });
  const clusters = [...bins.values()];
  for (let i = 0; i < clusters.length; i += 1) {
    for (let j = clusters.length - 1; j > i; j -= 1) {
      if (
        clusters[i]!.color[3] < 128 === clusters[j]!.color[3] < 128 &&
        distance(clusters[i]!.color, clusters[j]!.color) < 42
      ) {
        clusters[i]!.count += clusters[j]!.count;
        for (const index of clusters[j]!.members)
          clusters[i]!.members.push(index);
        clusters.splice(j, 1);
      }
    }
  }
  while (clusters.length > maximum) {
    let a = 0;
    let b = 1;
    let closest = Infinity;
    for (let i = 0; i < clusters.length; i += 1) {
      for (let j = i + 1; j < clusters.length; j += 1) {
        if (clusters[i]!.color[3] < 128 || clusters[j]!.color[3] < 128)
          continue;
        const score =
          distance(clusters[i]!.color, clusters[j]!.color) *
          Math.sqrt(Math.min(clusters[i]!.count, clusters[j]!.count));
        if (score < closest) {
          closest = score;
          a = i;
          b = j;
        }
      }
    }
    const target = clusters[a]!;
    const source = clusters[b]!;
    if (source.count > target.count) target.color = source.color;
    target.count += source.count;
    for (const index of source.members) target.members.push(index);
    clusters.splice(b, 1);
  }
  // Stable order is spatial, so a noisy JPEG retains the clean drawing's indices.
  clusters.sort((a, b) => a.members[0]! - b.members[0]!);
  const cells = Array<number>(samples.length).fill(0);
  clusters.forEach((entry, i) =>
    entry.members.forEach((index) => {
      cells[index] = i;
    }),
  );
  const transparent = clusters.findIndex((entry) => entry.color[3] < 128);
  const background = proposeImageBackground(
    { cols, rows, cells },
    transparent >= 0 ? transparent : undefined,
  );
  const palette = nameImageColors(
    clusters.map((entry, i) => ({
      id: `image-${i}`,
      name: '',
      hex:
        '#' +
        entry.color
          .slice(0, 3)
          .map((v) => v.toString(16).padStart(2, '0'))
          .join(''),
    })),
  );
  const transparentMask = samples.map((p) => p[3] < 128);
  transparentMask.forEach((value, i) => {
    if (value && background !== null) cells[i] = background;
  });
  return {
    cols,
    rows,
    cells,
    palette,
    background,
    transparent: transparentMask,
  };
}

export function mergeDrawingColors(
  drawing: ImportedDrawing,
  source: number,
  target: number,
): ImportedDrawing {
  if (source === target || !drawing.palette[source] || !drawing.palette[target])
    throw new RangeError('Elige dos colores distintos para fusionar.');
  const mapped = (i: number) => {
    const next = i === source ? target : i;
    return next > source ? next - 1 : next;
  };
  return {
    ...drawing,
    palette: drawing.palette.filter((_, i) => i !== source),
    cells: drawing.cells.map(mapped),
    background:
      drawing.background === null
        ? proposeImageBackground({
            ...drawing,
            cells: drawing.cells.map(mapped),
          })
        : mapped(drawing.background),
  };
}

export function photoMesh(
  image: PixelImage,
  cols: number,
  stitchWidthCm: number,
  rowHeightCm: number,
): ImageMesh {
  if (
    !Number.isFinite(stitchWidthCm) ||
    !Number.isFinite(rowHeightCm) ||
    stitchWidthCm <= 0 ||
    rowHeightCm <= 0
  )
    throw new RangeError('La muestra debe tener medidas positivas.');
  const rows = Math.max(
    1,
    Math.round(
      (((cols * image.height) / image.width) * stitchWidthCm) / rowHeightCm,
    ),
  );
  return manualMesh(image, cols, rows);
}

export function scaleDrawing(
  drawing: ImportedDrawing,
  cols: number,
): ImportedDrawing {
  const rows = Math.max(1, Math.round((drawing.rows * cols) / drawing.cols));
  validateEditorSize(cols, rows);
  const sourceIndices = Array.from(
    { length: cols * rows },
    (_, i) =>
      Math.min(
        drawing.rows - 1,
        Math.floor((Math.floor(i / cols) * drawing.rows) / rows),
      ) *
        drawing.cols +
      Math.min(
        drawing.cols - 1,
        Math.floor(((i % cols) * drawing.cols) / cols),
      ),
  );
  return {
    ...drawing,
    cols,
    rows,
    cells: sourceIndices.map((i) => drawing.cells[i]!),
    ...(drawing.transparent
      ? { transparent: sourceIndices.map((i) => drawing.transparent![i]!) }
      : {}),
  };
}

export function countDrawingColors(
  drawing: Grid,
  colorCount: number,
): number[] {
  const counts = Array<number>(colorCount).fill(0);
  for (const color of drawing.cells) {
    if (!Number.isInteger(color) || color < 0 || color >= colorCount)
      throw new RangeError(
        'Un cuadro tiene un color que no está en la paleta.',
      );
    counts[color]! += 1;
  }
  if (drawing.cells.length !== drawing.cols * drawing.rows)
    throw new RangeError('Faltan cuadros en el dibujo.');
  return counts;
}
