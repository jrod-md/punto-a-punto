import { gauge } from './gauge';
import type { GaugeProfile, Project } from './types';
import { requirePositive, validateProject } from './validation';

export interface YarnEstimate {
  colorId: string;
  workedStitches: number;
  carriedStitches: number;
  totalCm: number;
  meters: number;
  balls?: number;
}

function calculateColorYarn(project: Project, profile: GaugeProfile, colorId: string): YarnEstimate {
  const colorIndex = project.palette.findIndex((color) => color.id === colorId);
  const { yarnPerStitchCm, carriedPerStitchCm } = gauge(profile);
  let workedStitches = 0;
  let carriedStitches = 0;
  if (colorIndex >= 0) {
    for (let row = 0; row < project.rows; row += 1) {
      const cells = project.cells.slice(row * project.cols, (row + 1) * project.cols);
      const worked = cells.filter((color) => color === colorIndex).length;
      workedStitches += worked;
      if (project.carryAlways || (worked > 0 && new Set(cells).size >= 2)) {
        carriedStitches += project.cols - worked;
      }
    }
  }
  const used = workedStitches > 0 || carriedStitches > 0;
  const totalCm = used
    ? (workedStitches * yarnPerStitchCm + carriedStitches * carriedPerStitchCm + 30) * (1 + project.marginPercent / 100)
    : 0;
  const meters = Math.ceil(totalCm / 10) / 10;
  const estimate = { colorId, workedStitches, carriedStitches, totalCm, meters };
  return profile.metersPerBall === undefined
    ? estimate
    : { ...estimate, balls: Math.ceil(totalCm / 100 / profile.metersPerBall) };
}

export function estimateColorYarn(project: Project, profile: GaugeProfile, colorId: string): YarnEstimate {
  validateProject(project);
  if (profile.metersPerBall !== undefined) requirePositive(profile.metersPerBall, 'Los metros por ovillo');
  return calculateColorYarn(project, profile, colorId);
}

export function yarn(project: Project, profile: GaugeProfile): YarnEstimate[] {
  validateProject(project);
  if (profile.metersPerBall !== undefined) requirePositive(profile.metersPerBall, 'Los metros por ovillo');
  return project.palette.map((color) => calculateColorYarn(project, profile, color.id));
}
