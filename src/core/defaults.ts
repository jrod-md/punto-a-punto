import type { GaugeProfile } from './types';

export const DEFAULT_PROFILES: readonly Readonly<GaugeProfile>[] = Object.freeze([
  Object.freeze({
    id: 'default-3mm',
    name: 'Aguja 3 mm (aproximado)',
    hookMm: 3,
    construction: 'flat' as const,
    swatchStitches: 22,
    swatchRows: 24,
    swatchWidthCm: 10,
    swatchHeightCm: 10,
    yarnMeasuredCm: 260,
    yarnMeasuredStitches: 100,
    carriedFactor: 1.1,
    approximate: true,
  }),
  Object.freeze({
    id: 'default-4mm',
    name: 'Aguja 4 mm (aproximado)',
    hookMm: 4,
    construction: 'flat' as const,
    swatchStitches: 16,
    swatchRows: 18,
    swatchWidthCm: 10,
    swatchHeightCm: 10,
    yarnMeasuredCm: 380,
    yarnMeasuredStitches: 100,
    carriedFactor: 1.1,
    approximate: true,
  }),
]);
