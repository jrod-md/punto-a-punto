import type { GaugeProfile, Project } from './types';

export const TEST_PROFILE: GaugeProfile = {
  id: 'sample',
  name: 'Muestra propia',
  hookMm: 4,
  construction: 'flat',
  swatchStitches: 16,
  swatchRows: 18,
  swatchWidthCm: 10,
  swatchHeightCm: 10,
  yarnMeasuredCm: 380,
  yarnMeasuredStitches: 100,
  carriedFactor: 1.1,
  approximate: false,
};

export const TEST_PROJECT: Project = {
  id: 'example',
  name: 'Ejemplo',
  profileId: 'sample',
  construction: 'flat',
  cols: 4,
  rows: 2,
  palette: [
    { id: 'a', name: 'Crema', hex: '#fff8e7' },
    { id: 'b', name: 'Verde', hex: '#395b3e' },
    { id: 'c', name: 'Azul', hex: '#294a73' },
  ],
  backgroundColorId: 'a',
  cells: [0, 0, 1, 2, 1, 0, 0, 2],
  carryAlways: false,
  marginPercent: 10,
  progress: { row: 1, stitch: 1 },
  tapStep: 5,
};
