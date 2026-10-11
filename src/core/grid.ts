import type { Grid } from './types';
import { requireInteger, requireNonNegative, validateDimensions, validateGrid } from './validation';

export interface Bounds {
  left: number;
  bottom: number;
  width: number;
  height: number;
}

export interface MoveResult {
  grid: Grid;
  moved: boolean;
  warning: string | null;
}

export interface Margins {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

export interface CenterResult extends MoveResult {
  margins: Margins | null;
  exact: boolean;
}

export function createGrid(cols: number, rows: number, backgroundIndex: number): Grid {
  validateDimensions(cols, rows);
  requireInteger(backgroundIndex, 'El índice de fondo');
  requireNonNegative(backgroundIndex, 'El índice de fondo');
  return { cols, rows, cells: Array<number>(cols * rows).fill(backgroundIndex) };
}

function cellOffset(grid: Grid, col: number, row: number): number {
  requireInteger(col, 'La columna');
  requireInteger(row, 'La fila');
  if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) {
    throw new RangeError('La celda está fuera de la cuadrícula.');
  }
  return row * grid.cols + col;
}

export function readCell(grid: Grid, col: number, row: number): number {
  validateGrid(grid);
  const color = grid.cells[cellOffset(grid, col, row)];
  if (color === undefined) throw new RangeError('La celda no existe.');
  return color;
}

export function writeCell(grid: Grid, col: number, row: number, colorIndex: number): Grid {
  validateGrid(grid);
  requireInteger(colorIndex, 'El índice de color');
  requireNonNegative(colorIndex, 'El índice de color');
  const cells = [...grid.cells];
  cells[cellOffset(grid, col, row)] = colorIndex;
  return { ...grid, cells };
}

export function designBounds(grid: Grid, backgroundIndex: number): Bounds | null {
  validateGrid(grid);
  requireInteger(backgroundIndex, 'El índice de fondo');
  requireNonNegative(backgroundIndex, 'El índice de fondo');
  let left = grid.cols;
  let right = -1;
  let bottom = grid.rows;
  let top = -1;
  grid.cells.forEach((color, index) => {
    if (color === backgroundIndex) return;
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    left = Math.min(left, col);
    right = Math.max(right, col);
    bottom = Math.min(bottom, row);
    top = Math.max(top, row);
  });
  return right < 0 ? null : { left, bottom, width: right - left + 1, height: top - bottom + 1 };
}

// An optional destination supports checking whether a design fits a smaller grid.
// No source or destination cells are mutated, and rejected moves preserve the source.
export function moveDesign(grid: Grid, backgroundIndex: number, deltaCols: number, deltaRows: number, destination: Grid = grid): MoveResult {
  const bounds = designBounds(grid, backgroundIndex);
  validateGrid(destination);
  requireInteger(deltaCols, 'El desplazamiento horizontal');
  requireInteger(deltaRows, 'El desplazamiento vertical');
  if (!bounds) return { grid, moved: false, warning: null };
  const left = bounds.left + deltaCols;
  const bottom = bounds.bottom + deltaRows;
  if (left < 0 || bottom < 0 || left + bounds.width > destination.cols || bottom + bounds.height > destination.rows) {
    return { grid, moved: false, warning: 'El diseño no cabe en la cuadrícula; no se ha movido.' };
  }
  const cells = Array<number>(destination.cols * destination.rows).fill(backgroundIndex);
  grid.cells.forEach((color, index) => {
    if (color === backgroundIndex) return;
    const col = index % grid.cols + deltaCols;
    const row = Math.floor(index / grid.cols) + deltaRows;
    cells[row * destination.cols + col] = color;
  });
  return { grid: { cols: destination.cols, rows: destination.rows, cells }, moved: true, warning: null };
}

export function centerDesign(grid: Grid, backgroundIndex: number, destination: Grid = grid): CenterResult {
  const bounds = designBounds(grid, backgroundIndex);
  validateGrid(destination);
  if (!bounds) return { grid, moved: false, warning: null, margins: null, exact: true };
  const left = Math.floor((destination.cols - bounds.width) / 2);
  const bottom = Math.floor((destination.rows - bounds.height) / 2);
  const result = moveDesign(grid, backgroundIndex, left - bounds.left, bottom - bounds.bottom, destination);
  if (!result.moved) return { ...result, margins: null, exact: false };
  const margins = {
    left,
    right: destination.cols - bounds.width - left,
    bottom,
    top: destination.rows - bounds.height - bottom,
  };
  const warnings: string[] = [];
  if (margins.left !== margins.right) warnings.push('El diseño no puede quedar exactamente centrado: sobra un punto a la derecha.');
  if (margins.bottom !== margins.top) warnings.push('El diseño no puede quedar exactamente centrado: sobra una fila arriba.');
  return { ...result, margins, exact: warnings.length === 0, warning: warnings.length ? warnings.join(' ') : null };
}
