import type { Bounds } from './grid';
import { createGrid, designBounds, moveDesign } from './grid';
import type { Project } from './types';
import {
  requireInteger,
  validateDimensions,
  validateProject,
} from './validation';
import { adjustProgress } from './weaving';

export interface CellPoint {
  col: number;
  row: number;
}
export interface History {
  past: readonly Project[];
  present: Project;
  future: readonly Project[];
}

export function createHistory(project: Project): History {
  return { past: [], present: project, future: [] };
}

export function commitHistory(history: History, project: Project): History {
  if (project === history.present) return history;
  return {
    past: [...history.past, history.present].slice(-100),
    present: project,
    future: [],
  };
}

export function undoHistory(history: History): History {
  const previous = history.past.at(-1);
  return previous
    ? {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      }
    : history;
}

export function redoHistory(history: History): History {
  const next = history.future[0];
  return next
    ? {
        past: [...history.past, history.present].slice(-100),
        present: next,
        future: history.future.slice(1),
      }
    : history;
}

// Bresenham interpolation avoids holes even when pointer events skip cells.
export function linePoints(start: CellPoint, end: CellPoint): CellPoint[] {
  for (const value of [start.col, start.row, end.col, end.row])
    requireInteger(value, 'La coordenada');
  let col = start.col;
  let row = start.row;
  const dx = Math.abs(end.col - col);
  const dy = -Math.abs(end.row - row);
  const sx = col < end.col ? 1 : -1;
  const sy = row < end.row ? 1 : -1;
  let error = dx + dy;
  const points: CellPoint[] = [];
  while (true) {
    points.push({ col, row });
    if (col === end.col && row === end.row) return points;
    const twice = 2 * error;
    if (twice >= dy) {
      error += dy;
      col += sx;
    }
    if (twice <= dx) {
      error += dx;
      row += sy;
    }
  }
}

export function paintStroke(
  project: Project,
  indices: Iterable<number>,
  colorIndex: number,
): Project {
  validateProject(project);
  requireInteger(colorIndex, 'El color');
  if (colorIndex < 0 || colorIndex >= project.palette.length)
    throw new RangeError('El color no está en la paleta.');
  const cells = [...project.cells];
  let changed = false;
  for (const index of indices) {
    requireInteger(index, 'La celda');
    if (index < 0 || index >= cells.length)
      throw new RangeError('La celda está fuera de la cuadrícula.');
    if (cells[index] !== colorIndex) {
      cells[index] = colorIndex;
      changed = true;
    }
  }
  return changed ? { ...project, cells } : project;
}

export function floodFill(
  project: Project,
  point: CellPoint,
  colorIndex: number,
): Project {
  validateProject(project);
  requireInteger(point.col, 'La columna');
  requireInteger(point.row, 'La fila');
  if (
    point.col < 0 ||
    point.col >= project.cols ||
    point.row < 0 ||
    point.row >= project.rows
  )
    throw new RangeError('La celda está fuera de la cuadrícula.');
  const start = point.row * project.cols + point.col;
  const previous = project.cells[start];
  if (previous === colorIndex) return project;
  const visited = new Set<number>([start]);
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor]!;
    const col = index % project.cols;
    const candidates = [index - project.cols, index + project.cols];
    if (col > 0) candidates.push(index - 1);
    if (col < project.cols - 1) candidates.push(index + 1);
    for (const neighbor of candidates) {
      if (
        neighbor >= 0 &&
        neighbor < project.cells.length &&
        !visited.has(neighbor) &&
        project.cells[neighbor] === previous
      ) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return paintStroke(project, visited, colorIndex);
}

export function selectionBounds(start: CellPoint, end: CellPoint): Bounds {
  for (const value of [start.col, start.row, end.col, end.row])
    requireInteger(value, 'La coordenada');
  return {
    left: Math.min(start.col, end.col),
    bottom: Math.min(start.row, end.row),
    width: Math.abs(start.col - end.col) + 1,
    height: Math.abs(start.row - end.row) + 1,
  };
}

export function moveSelection(
  project: Project,
  bounds: Bounds,
  deltaCols: number,
  deltaRows: number,
): { project: Project; warning: string | null } {
  validateProject(project);
  for (const value of [
    bounds.left,
    bounds.bottom,
    bounds.width,
    bounds.height,
    deltaCols,
    deltaRows,
  ])
    requireInteger(value, 'La selección');
  const left = bounds.left + deltaCols;
  const bottom = bounds.bottom + deltaRows;
  if (
    bounds.width < 1 ||
    bounds.height < 1 ||
    bounds.left < 0 ||
    bounds.bottom < 0 ||
    bounds.left + bounds.width > project.cols ||
    bounds.bottom + bounds.height > project.rows
  ) {
    throw new RangeError('La selección está fuera de la cuadrícula.');
  }
  if (
    left < 0 ||
    bottom < 0 ||
    left + bounds.width > project.cols ||
    bottom + bounds.height > project.rows
  ) {
    return {
      project,
      warning: 'La selección no cabe en esa posición; no se ha movido.',
    };
  }
  if (!deltaCols && !deltaRows) return { project, warning: null };
  const cells = [...project.cells];
  const background = project.palette.findIndex(
    (color) => color.id === project.backgroundColorId,
  );
  for (let row = 0; row < bounds.height; row += 1) {
    for (let col = 0; col < bounds.width; col += 1)
      cells[(bounds.bottom + row) * project.cols + bounds.left + col] =
        background;
  }
  for (let row = 0; row < bounds.height; row += 1) {
    for (let col = 0; col < bounds.width; col += 1) {
      cells[(bottom + row) * project.cols + left + col] =
        project.cells[
          (bounds.bottom + row) * project.cols + bounds.left + col
        ]!;
    }
  }
  return { project: { ...project, cells }, warning: null };
}

export function deleteColor(project: Project, colorId: string): Project {
  validateProject(project);
  if (colorId === project.backgroundColorId)
    throw new RangeError('El color de fondo no se puede borrar.');
  const removed = project.palette.findIndex((color) => color.id === colorId);
  if (removed < 0) throw new RangeError('El color no está en la paleta.');
  const background = project.palette.findIndex(
    (color) => color.id === project.backgroundColorId,
  );
  const nextBackground = background > removed ? background - 1 : background;
  return {
    ...project,
    palette: project.palette.filter((color) => color.id !== colorId),
    cells: project.cells.map((color) =>
      color === removed ? nextBackground : color > removed ? color - 1 : color,
    ),
  };
}

export function resizeProject(
  project: Project,
  cols: number,
  rows: number,
  allowCrop = false,
): { project: Project; needsCrop: boolean } {
  validateProject(project);
  validateDimensions(cols, rows);
  const background = project.palette.findIndex(
    (color) => color.id === project.backgroundColorId,
  );
  const bounds = designBounds(project, background);
  const needsCrop =
    bounds !== null && (bounds.width > cols || bounds.height > rows);
  if (needsCrop && !allowCrop) return { project, needsCrop: true };
  if (cols === project.cols && rows === project.rows)
    return { project, needsCrop: false };
  if (bounds && !needsCrop) {
    const dx = Math.min(0, cols - bounds.width - bounds.left);
    const dy = Math.min(0, rows - bounds.height - bounds.bottom);
    const moved = moveDesign(
      project,
      background,
      dx,
      dy,
      createGrid(cols, rows, background),
    );
    return {
      project: {
        ...project,
        ...moved.grid,
        progress: adjustProgress({ ...project, cols, rows }),
      },
      needsCrop: false,
    };
  }
  const cells = Array<number>(cols * rows).fill(background);
  for (let row = 0; row < Math.min(rows, project.rows); row += 1) {
    for (let col = 0; col < Math.min(cols, project.cols); col += 1)
      cells[row * cols + col] = project.cells[row * project.cols + col]!;
  }
  return {
    project: {
      ...project,
      cols,
      rows,
      cells,
      progress: adjustProgress({ ...project, cols, rows }),
    },
    needsCrop,
  };
}
