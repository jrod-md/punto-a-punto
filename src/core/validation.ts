import type { Grid, Project } from './types';

export function requirePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} debe ser un número positivo y finito.`);
  }
}

export function requireNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} debe ser un número no negativo y finito.`);
  }
}

export function requireInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} debe ser un entero seguro.`);
  }
}

export function validateDimensions(cols: number, rows: number): void {
  requirePositive(cols, 'Las columnas');
  requirePositive(rows, 'Las filas');
  requireInteger(cols, 'Las columnas');
  requireInteger(rows, 'Las filas');
  requireInteger(cols * rows, 'La cantidad de celdas');
}

export function validateGrid(grid: Grid): void {
  validateDimensions(grid.cols, grid.rows);
  if (grid.cells.length !== grid.cols * grid.rows) {
    throw new RangeError(
      'La cantidad de celdas no coincide con la cuadrícula.',
    );
  }
  for (const color of grid.cells) {
    requireInteger(color, 'El índice de color');
    requireNonNegative(color, 'El índice de color');
  }
}

export function validateProject(project: Project): void {
  validateGrid(project);
  if (project.palette.length < 1 || project.palette.length > 12) {
    throw new RangeError('La paleta debe tener entre 1 y 12 colores.');
  }
  const ids = new Set(project.palette.map((color) => color.id));
  if (
    ids.size !== project.palette.length ||
    !ids.has(project.backgroundColorId)
  ) {
    throw new RangeError(
      'Los colores deben tener identificadores únicos y un fondo válido.',
    );
  }
  if (project.cells.some((color) => color >= project.palette.length)) {
    throw new RangeError('Hay celdas con colores que no están en la paleta.');
  }
  if (project.construction !== 'flat' && project.construction !== 'round') {
    throw new RangeError('La construcción debe ser en plano o en redondo.');
  }
  requireNonNegative(project.marginPercent, 'El margen');
}
