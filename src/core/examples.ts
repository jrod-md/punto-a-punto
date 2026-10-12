import { centerDesign, createGrid } from './grid';
import { sizing } from './sizing';
import type { GaugeProfile, Grid, PaletteColor, Project } from './types';

export interface ExampleDrawing extends Grid {
  id: string;
  name: string;
  palette: readonly PaletteColor[];
}

// Original drawings, written from top to bottom. Dots are the background.
const sketches = [
  {
    id: 'heart',
    name: 'Corazón',
    colors: [
      ['Crema', '#faf5ec'],
      ['Terracota', '#c9694a'],
      ['Rosa', '#e9b3a6'],
    ],
    rows: [
      '..1111....1111..',
      '.111111..111111.',
      '1122111111111111',
      '1122111111111111',
      '1111111111111111',
      '.11111111111111.',
      '..111111111111..',
      '...1111111111...',
      '....11111111....',
      '.....111111.....',
      '......1111......',
      '.......11.......',
    ],
  },
  {
    id: 'flower',
    name: 'Flor',
    colors: [
      ['Crema', '#faf5ec'],
      ['Terracota', '#c9694a'],
      ['Verde', '#4f7a5a'],
    ],
    rows: [
      '......1111......',
      '.....111111.....',
      '..111111111111..',
      '.11111122111111.',
      '.11111222211111.',
      '..111112211111..',
      '....11111111....',
      '.....111111.....',
      '.......22.......',
      '...22..22.......',
      '...222.22.......',
      '....22222.222...',
      '.....22222222...',
      '.......22222....',
      '.......22.......',
      '.......22.......',
    ],
  },
  {
    id: 'sheep',
    name: 'Ovejita',
    colors: [
      ['Verde suave', '#dfead9'],
      ['Lana crema', '#fffcf6'],
      ['Oscuro', '#3a2f2a'],
    ],
    rows: [
      '.......11..11.....',
      '.....1111111111...',
      '..11.11111111111..',
      '.1111111111111111.',
      '222222111111111111',
      '.22222111111111111',
      '.21212111111111111',
      '.22222111111111111',
      '..222111111111111.',
      '.....11111111111..',
      '......111111111...',
      '......22....22....',
      '......22....22....',
      '.....222...222....',
    ],
  },
  {
    id: 'star',
    name: 'Estrella',
    colors: [
      ['Crema', '#faf5ec'],
      ['Amarillo', '#f2d684'],
    ],
    rows: [
      '........11........',
      '.......1111.......',
      '.......1111.......',
      '......111111......',
      '..11111111111111..',
      '.1111111111111111.',
      '...111111111111...',
      '....1111111111....',
      '.....11111111.....',
      '.....11111111.....',
      '....1111111111....',
      '....1111..1111....',
      '...1111....1111...',
      '...11........11...',
    ],
  },
] as const;

export const EXAMPLE_DRAWINGS: readonly ExampleDrawing[] = sketches.map(
  (sketch) => {
    const cols = 20;
    const rows = 20;
    const cells = Array<number>(cols * rows).fill(0);
    const top = Math.floor((rows - sketch.rows.length) / 2);
    sketch.rows.forEach((line, y) => {
      const left = Math.floor((cols - line.length) / 2);
      [...line].forEach((point, x) => {
        cells[(rows - 1 - top - y) * cols + left + x] =
          point === '.' ? 0 : Number(point);
      });
    });
    return {
      id: sketch.id,
      name: sketch.name,
      cols,
      rows,
      cells: Object.freeze(cells),
      palette: sketch.colors.map(([name, hex], index) => ({
        id: `${sketch.id}-${index}`,
        name,
        hex,
      })),
    };
  },
);

export function createExampleProject(
  drawing: ExampleDrawing,
  profile: GaugeProfile,
  id: string,
): Project {
  const size = sizing(profile, 30, 30);
  const destination = createGrid(size.cols, size.rows, 0);
  const centered = centerDesign(drawing, 0, destination);
  if (!centered.moved)
    throw new RangeError('El ejemplo no cabe con esta muestra de 4 mm.');
  return {
    ...centered.grid,
    id,
    name: drawing.name,
    profileId: profile.id,
    construction: 'flat',
    palette: drawing.palette.map((color) => ({ ...color })),
    backgroundColorId: drawing.palette[0]!.id,
    carryAlways: false,
    marginPercent: 10,
    progress: { row: 1, stitch: 1 },
    tapStep: 5,
  };
}
