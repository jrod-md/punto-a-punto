import { centerDesign, createGrid } from './grid';
import type { ImportedDrawing } from './imageImport';
import type { Grid, PaletteColor } from './types';
import { requireInteger, requireNonNegative, validateGrid } from './validation';

function majority(grid: Grid, indices: readonly number[]): number | null {
  const counts = new Map<number, number>();
  let winner = grid.cells[indices[0]!]!;
  for (const index of indices) {
    const color = grid.cells[index]!;
    counts.set(color, (counts.get(color) ?? 0) + 1);
    if (counts.get(color)! > (counts.get(winner) ?? 0)) winner = color;
  }
  return counts.get(winner)! * 2 > indices.length ? winner : null;
}

export function proposeImageBackground(
  grid: Grid,
  transparentBackground?: number,
): number | null {
  validateGrid(grid);
  // Transparent pixels already establish background, independently of tone.
  if (transparentBackground !== undefined) {
    requireInteger(transparentBackground, 'El fondo transparente');
    requireNonNegative(transparentBackground, 'El fondo transparente');
    if (!grid.cells.includes(transparentBackground))
      throw new RangeError('El fondo transparente no está en el dibujo.');
    return transparentBackground;
  }
  const border: number[] = [];
  for (let col = 0; col < grid.cols; col += 1) {
    border.push(col);
    if (grid.rows > 1) border.push((grid.rows - 1) * grid.cols + col);
  }
  for (let row = 1; row < grid.rows - 1; row += 1) {
    border.push(row * grid.cols);
    if (grid.cols > 1) border.push(row * grid.cols + grid.cols - 1);
  }
  const proposed = majority(grid, border);
  if (proposed !== null) return proposed;
  const corners = [
    ...new Set([
      0,
      grid.cols - 1,
      (grid.rows - 1) * grid.cols,
      grid.cols * grid.rows - 1,
    ]),
  ];
  return majority(grid, corners);
}

function tone(hex: string): { name: string; lightness: number } {
  if (!/^#[\da-f]{6}$/i.test(hex))
    throw new RangeError('El color debe ser un hexadecimal válido.');
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  ) as [number, number, number];
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const delta = maximum - minimum;
  const saturation = maximum ? delta / maximum : 0;
  const lightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let name: string;
  if (saturation < 0.16)
    name = maximum < 0.28 ? 'Negro' : minimum > 0.9 ? 'Blanco' : 'Gris';
  else {
    const raw =
      maximum === r
        ? (g - b) / delta
        : maximum === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    const hue = (raw * 60 + 360) % 360;
    if (hue >= 8 && hue < 65 && maximum < 0.68) name = 'Marrón';
    else if (hue >= 18 && hue < 65 && saturation < 0.5) name = 'Beige';
    else if (
      (hue >= 315 && hue < 355) ||
      (hue < 15 && saturation < 0.5 && maximum > 0.85)
    )
      name = 'Rosa';
    else if (hue < 15 || hue >= 355) name = 'Rojo';
    else if (hue < 45) name = 'Naranja';
    else if (hue < 75) name = 'Amarillo';
    else if (hue < 180) name = 'Verde';
    else if (hue < 255) name = 'Azul';
    else name = 'Morado';
  }
  return { name, lightness };
}

export function nameImageColors(
  palette: readonly PaletteColor[],
): PaletteColor[] {
  const tones = palette.map((color) => tone(color.hex));
  return palette.map((color, i) => {
    const current = tones[i]!;
    const relatives = tones
      .map((value, index) => ({ ...value, index }))
      .filter((value) => value.name === current.name)
      .sort((a, b) => a.lightness - b.lightness || a.index - b.index);
    const position = relatives.findIndex((value) => value.index === i);
    const suffix =
      relatives.length < 2
        ? ''
        : position === 0
          ? ' oscuro'
          : position === relatives.length - 1
            ? ' claro'
            : '';
    return { ...color, name: current.name + suffix };
  });
}

export function previewDrawingOnBackground(
  drawing: ImportedDrawing,
  padding = Math.max(2, Math.ceil(Math.max(drawing.cols, drawing.rows) / 6)),
): ImportedDrawing {
  validateGrid(drawing);
  requireInteger(padding, 'El margen de la vista previa');
  requireNonNegative(padding, 'El margen de la vista previa');
  if (drawing.background === null || !drawing.palette[drawing.background])
    throw new RangeError('Elige un color de fondo para comprobar el dibujo.');
  const destination = createGrid(
    drawing.cols + padding * 2,
    drawing.rows + padding * 2,
    drawing.background,
  );
  const result = centerDesign(drawing, drawing.background, destination);
  return {
    ...(result.moved ? result.grid : destination),
    palette: drawing.palette,
    background: drawing.background,
  };
}
