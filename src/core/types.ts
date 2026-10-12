export type Construction = 'flat' | 'round';
export type TapStep = number | 'color-run';
export interface Progress {
  row: number;
  stitch: number;
}

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
  // One-based next stitch; cols + 1 means that the row is complete.
  progress: Progress;
  tapStep: TapStep;
}

export interface ProjectRecord extends Project {
  updatedAt: string;
}
