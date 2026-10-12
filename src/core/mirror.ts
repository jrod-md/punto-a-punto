import { requireInteger, validateDimensions } from './validation';

// A set prevents duplicate central cells and keeps each reflected stroke atomic.
export function mirroredIndices(
  cols: number,
  rows: number,
  indices: Iterable<number>,
): ReadonlySet<number> {
  validateDimensions(cols, rows);
  const result = new Set<number>();
  for (const index of indices) {
    requireInteger(index, 'La celda');
    if (index < 0 || index >= cols * rows)
      throw new RangeError('La celda está fuera de la cuadrícula.');
    const col = index % cols;
    result.add(index);
    result.add(Math.floor(index / cols) * cols + cols - 1 - col);
  }
  return result;
}
