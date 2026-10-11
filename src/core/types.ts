export type Construction = 'flat' | 'round';

export interface GaugeProfile {
  id: string;
  name: string;
  hookMm: number;
  construction: Construction;
  swatchStitches: number;
  swatchRows: number;
  swatchWidthCm: number;
  swatchHeightCm: number;
  yarnMeasuredCm: number;
  yarnMeasuredStitches: number;
  carriedFactor: number;
  metersPerBall?: number;
  approximate: boolean;
}

export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
}

export interface Grid {
  cols: number;
  rows: number;
  // Row-major palette indices; row 0 is the bottom, column 0 is the left.
  cells: readonly number[];
}

export interface Project extends Grid {
  id: string;
  name: string;
  profileId: string;
  construction: Construction;
  palette: readonly PaletteColor[];
  backgroundColorId: string;
  carryAlways: boolean;
  marginPercent: number;
  // Progress uses one-based row and stitch numbers.
  progress: { row: number; stitch: number };
  tapStep: number;
}
