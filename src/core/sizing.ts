import { gauge } from './gauge';
import type { GaugeProfile } from './types';
import { requireNonNegative, validateDimensions } from './validation';

export interface SizingResult {
  cols: number;
  rows: number;
  realWidthCm: number;
  realHeightCm: number;
}

export function sizing(
  profile: GaugeProfile,
  targetWidthCm: number,
  targetHeightCm: number,
): SizingResult {
  requireNonNegative(targetWidthCm, 'El ancho deseado');
  requireNonNegative(targetHeightCm, 'El alto deseado');
  const { stitchWidthCm, rowHeightCm } = gauge(profile);
  const cols = Math.max(1, Math.round(targetWidthCm / stitchWidthCm));
  const rows = Math.max(1, Math.round(targetHeightCm / rowHeightCm));
  validateDimensions(cols, rows);
  return {
    cols,
    rows,
    realWidthCm: cols * stitchWidthCm,
    realHeightCm: rows * rowHeightCm,
  };
}
