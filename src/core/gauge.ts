import type { GaugeProfile } from './types';
import { requireNonNegative, requirePositive } from './validation';

export interface Gauge {
  stitchWidthCm: number;
  rowHeightCm: number;
  yarnPerStitchCm: number;
  carriedPerStitchCm: number;
}

export function gauge(profile: GaugeProfile): Gauge {
  requirePositive(profile.swatchWidthCm, 'El ancho de la muestra');
  requirePositive(profile.swatchHeightCm, 'El alto de la muestra');
  requirePositive(profile.swatchStitches, 'Los puntos de la muestra');
  requirePositive(profile.swatchRows, 'Las filas de la muestra');
  requirePositive(profile.yarnMeasuredCm, 'El hilo medido');
  requirePositive(profile.yarnMeasuredStitches, 'Los puntos de calibración');
  requireNonNegative(profile.carriedFactor, 'El factor de hilo llevado');

  const stitchWidthCm = profile.swatchWidthCm / profile.swatchStitches;
  return {
    stitchWidthCm,
    rowHeightCm: profile.swatchHeightCm / profile.swatchRows,
    yarnPerStitchCm: profile.yarnMeasuredCm / profile.yarnMeasuredStitches,
    carriedPerStitchCm: stitchWidthCm * profile.carriedFactor,
  };
}
