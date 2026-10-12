import type { Progress, Project, TapStep } from './types';
import { requireInteger, validateDimensions } from './validation';

export function adjustProgress(project: Pick<Project, 'cols' | 'rows' | 'progress'>): Progress {
  validateDimensions(project.cols, project.rows);
  const { row, stitch } = project.progress;
  requireInteger(row, 'La fila actual'); requireInteger(stitch, 'El punto actual');
  return { row: Math.max(1, Math.min(project.rows, row)), stitch: Math.max(1, Math.min(project.cols + 1, stitch)) };
}

export function readingColumn(project: Pick<Project, 'cols' | 'construction'>, row: number, stitch: number): number {
  requireInteger(row, 'La fila'); requireInteger(stitch, 'El punto');
  if (row < 1 || stitch < 1 || stitch > project.cols) throw new RangeError('El punto está fuera de la fila.');
  return project.construction === 'round' || row % 2 === 1 ? project.cols - stitch : stitch - 1;
}

export function currentRun(project: Project): { remaining: number; colorId: string; next: { count: number; colorId: string } | null } | null {
  const progress = adjustProgress(project);
  if (progress.stitch > project.cols) return null;
  const colorAt = (stitch: number) => project.cells[(progress.row - 1) * project.cols + readingColumn(project, progress.row, stitch)];
  const color = colorAt(progress.stitch);
  let end = progress.stitch + 1;
  while (end <= project.cols && colorAt(end) === color) end += 1;
  const current = project.palette[color ?? -1];
  if (!current) throw new RangeError('El punto no tiene un color válido.');
  if (end > project.cols) return { remaining: end - progress.stitch, colorId: current.id, next: null };
  const following = project.palette[colorAt(end) ?? -1];
  if (!following) throw new RangeError('El tramo siguiente no tiene un color válido.');
  let nextEnd = end + 1;
  while (nextEnd <= project.cols && colorAt(nextEnd) === colorAt(end)) nextEnd += 1;
  return { remaining: end - progress.stitch, colorId: current.id, next: { count: nextEnd - end, colorId: following.id } };
}

export function advanceProgress(project: Project, step: TapStep = project.tapStep) {
  const progress = adjustProgress(project);
  const finished = progress.row === project.rows && progress.stitch === project.cols + 1;
  if (progress.stitch > project.cols) return { progress, advanced: 0, needsNextRow: !finished, finished };
  if (step !== 'color-run' && (!Number.isSafeInteger(step) || step < 1)) throw new RangeError('El paso debe ser un número entero positivo o un tramo de color.');
  const count = step === 'color-run' ? currentRun({ ...project, progress })!.remaining : step;
  const advanced = Math.min(count, project.cols - progress.stitch + 1);
  const next = { ...progress, stitch: progress.stitch + advanced };
  return { progress: next, advanced, needsNextRow: false, finished: next.row === project.rows && next.stitch === project.cols + 1 };
}

export function nextRow(project: Project): Progress {
  const progress = adjustProgress(project);
  if (progress.stitch !== project.cols + 1) throw new RangeError('Termina esta fila antes de pasar a la siguiente.');
  return progress.row < project.rows ? { row: progress.row + 1, stitch: 1 } : progress;
}

export function finishRow(project: Project): Progress { return { ...adjustProgress(project), stitch: project.cols + 1 }; }
export function previousRow(project: Project): Progress { const progress = adjustProgress(project); return progress.row > 1 ? { row: progress.row - 1, stitch: project.cols + 1 } : progress; }
export interface ProgressHistory { present: Progress; past: readonly Progress[] }
export function progressHistory(project: Project): ProgressHistory { return { present: adjustProgress(project), past: [] }; }
export function commitProgress(history: ProgressHistory, progress: Progress): ProgressHistory {
  if (history.present.row === progress.row && history.present.stitch === progress.stitch) return history;
  return { present: progress, past: [...history.past, history.present].slice(-100) };
}
export function undoProgress(history: ProgressHistory): ProgressHistory { const previous = history.past.at(-1); return previous ? { present: previous, past: history.past.slice(0, -1) } : history; }
