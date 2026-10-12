import type { Bounds } from './grid';
import type { Project } from './types';
import { validateProject } from './validation';

// Original stitch lettering. Each slash separates one row, read from the top.
const patterns: Readonly<Record<string, string>> = {
  A: '..#../.#.#./#...#/#...#/#####/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.####/#..../#..../#..../#..../#..../.####',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.####/#..../#..../#.###/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#...#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#...#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  Ñ: '.#.#./..#../#...#/##..#/#.#.#/#..##/#...#',
  Á: '...#./..#../.###./#...#/#####/#...#/#...#',
  É: '...#./..#../#####/#..../####./#..../#####',
  Í: '...#./..#../.###./..#../..#../..#../.###.',
  Ó: '...#./..#../.###./#...#/#...#/#...#/.###.',
  Ú: '...#./..#../#...#/#...#/#...#/#...#/.###.',
  Ü: '.#.#./...../#...#/#...#/#...#/#...#/.###.',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '####./....#/....#/.###./....#/....#/####.',
  '4': '#...#/#...#/#...#/#####/....#/....#/....#',
  '5': '#####/#..../#..../####./....#/....#/####.',
  '6': '.###./#..../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../..#../..#../..#..',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '...../...../...../...../...../...../.....',
  '.': '...../...../...../...../...../..##./..##.',
  ',': '...../...../...../...../..##./...#./..#..',
  '-': '...../...../...../.###./...../...../.....',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '♥': '.#.#./#####/#####/.###./.###./..#../.....',
};

export const STITCH_FONT: Readonly<Record<string, readonly string[]>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(patterns).map(([character, rows]) => [
        character,
        Object.freeze(rows.split('/')),
      ]),
    ),
  );

export interface StitchText {
  cols: number;
  rows: number;
  cells: readonly boolean[];
  omitted: readonly string[];
  lines: readonly string[];
}

export function renderStitchText(
  text: string,
  scale: number = 1,
  twoLines = false,
): StitchText {
  if (![1, 2, 3].includes(scale))
    throw new RangeError('El tamaño de texto debe ser normal, doble o triple.');
  const omitted = new Set<string>();
  let supported = '';
  for (const character of text.normalize('NFC')) {
    const upper = character.toUpperCase();
    if (Object.hasOwn(STITCH_FONT, upper)) supported += upper;
    else omitted.add(character);
  }
  supported = supported.trim();
  const lines = [supported];
  if (twoLines && supported.length > 1) {
    // Prefer a word boundary; single names split at the closest middle stitch.
    const spaces = [...supported]
      .map((character, index) => (character === ' ' ? index : -1))
      .filter((index) => index > 0 && index < supported.length - 1);
    const middle = supported.length / 2;
    const split = spaces.length
      ? spaces.reduce((best, index) =>
          Math.abs(index - middle) < Math.abs(best - middle) ? index : best,
        )
      : Math.ceil(middle);
    lines.splice(
      0,
      1,
      supported.slice(0, split).trim(),
      supported.slice(split).trim(),
    );
  }
  const width = Math.max(
    ...lines.map((line) => Math.max(0, line.length * 6 - 1)),
  );
  const cols = width * scale;
  const rows = supported ? (lines.length * 8 - 1) * scale : 0;
  const cells = Array<boolean>(cols * rows).fill(false);
  lines.forEach((line, lineIndex) => {
    const left = Math.floor((width - (line.length * 6 - 1)) / 2);
    [...line].forEach((character, characterIndex) => {
      STITCH_FONT[character]!.forEach((row, y) => {
        [...row].forEach((point, x) => {
          if (point !== '#') return;
          for (let dy = 0; dy < scale; dy += 1)
            for (let dx = 0; dx < scale; dx += 1) {
              const col = (left + characterIndex * 6 + x) * scale + dx;
              const bottom = rows - 1 - (lineIndex * 8 + y) * scale - dy;
              cells[bottom * cols + col] = true;
            }
        });
      });
    });
  });
  return { cols, rows, cells, omitted: [...omitted], lines };
}

export interface TextPlacement {
  project: Project | null;
  selection: Bounds | null;
  reason: string | null;
}

export function placeStitchText(
  project: Project,
  drawing: StitchText,
  colorIndex: number,
): TextPlacement {
  validateProject(project);
  if (!Number.isInteger(colorIndex) || !project.palette[colorIndex])
    throw new RangeError('El color no está en la paleta.');
  let reason: string | null = null;
  if (!drawing.cells.some(Boolean)) reason = 'Escribe un texto para colocarlo.';
  else if (project.palette[colorIndex]!.id === project.backgroundColorId)
    reason = 'Elige un color distinto del fondo para que se vea el texto.';
  else if (drawing.cols > project.cols)
    reason = 'El texto no cabe a lo ancho de la pieza.';
  else if (drawing.rows > project.rows)
    reason = 'El texto no cabe a lo alto de la pieza.';
  if (reason) return { project: null, selection: null, reason };
  const selection = {
    left: Math.floor((project.cols - drawing.cols) / 2),
    bottom: Math.floor((project.rows - drawing.rows) / 2),
    width: drawing.cols,
    height: drawing.rows,
  };
  const cells = [...project.cells];
  drawing.cells.forEach((painted, index) => {
    if (!painted) return;
    const col = selection.left + (index % drawing.cols);
    const row = selection.bottom + Math.floor(index / drawing.cols);
    cells[row * project.cols + col] = colorIndex;
  });
  return { project: { ...project, cells }, selection, reason: null };
}
