import { gauge } from './gauge';
import type { GaugeProfile, ProjectRecord } from './types';
import { requireInteger, requirePositive, validateProject } from './validation';

export interface ProjectFile { formatVersion: 1 | 2; project: ProjectRecord; profile: GaugeProfile }
export interface PackedProject extends Omit<ProjectRecord, 'cells'> { cells: Uint8Array }

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El archivo debe contener objetos válidos.');
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Falta un texto o identificador válido.');
  return value;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Hay una medida que no es un número válido.');
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Hay una opción que no es válida.');
  return value;
}

function construction(value: unknown): 'flat' | 'round' {
  if (value !== 'flat' && value !== 'round') throw new Error('La construcción debe ser en plano o en redondo.');
  return value;
}

export function validateEditorSize(cols: number, rows: number): void {
  for (const value of [cols, rows]) {
    requireInteger(value, 'El tamaño');
    if (value < 1 || value > 1000) throw new RangeError('El tamaño debe estar entre 1 y 1000 puntos o filas.');
  }
}

export function parseProjectFile(source: string): ProjectFile {
  let parsed: unknown;
  try { parsed = JSON.parse(source) as unknown; } catch { throw new Error('El archivo no es un JSON válido.'); }
  const root = object(parsed);
  if (root.formatVersion !== 1 && root.formatVersion !== 2) throw new Error('La versión del archivo no es compatible.');
  const data = object(root.project);
  const sample = object(root.profile);
  const profile: GaugeProfile = {
    id: text(sample.id), name: text(sample.name), hookMm: number(sample.hookMm), construction: construction(sample.construction),
    swatchStitches: number(sample.swatchStitches), swatchRows: number(sample.swatchRows), swatchWidthCm: number(sample.swatchWidthCm), swatchHeightCm: number(sample.swatchHeightCm),
    yarnMeasuredCm: number(sample.yarnMeasuredCm), yarnMeasuredStitches: number(sample.yarnMeasuredStitches), carriedFactor: number(sample.carriedFactor), approximate: boolean(sample.approximate),
    ...(sample.metersPerBall === undefined ? {} : { metersPerBall: number(sample.metersPerBall) }),
  };
  gauge(profile);
  requirePositive(profile.hookMm, 'La aguja');
  for (const value of [profile.swatchStitches, profile.swatchRows, profile.yarnMeasuredStitches]) requireInteger(value, 'Los puntos de la muestra');
  if (profile.metersPerBall !== undefined) requirePositive(profile.metersPerBall, 'Los metros por ovillo');
  const cols = number(data.cols);
  const rows = number(data.rows);
  validateEditorSize(cols, rows);
  if (!Array.isArray(data.palette) || !Array.isArray(data.cells)) throw new Error('Faltan la paleta o las celdas.');
  const progress = object(data.progress);
  const project: ProjectRecord = {
    id: text(data.id), name: text(data.name), profileId: text(data.profileId), construction: construction(data.construction), cols, rows,
    palette: data.palette.map((entry: unknown) => {
      const color = object(entry);
      const hex = text(color.hex);
      if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Hay un color con formato inválido.');
      return { id: text(color.id), name: text(color.name), hex };
    }),
    cells: data.cells.map((value: unknown) => number(value)), backgroundColorId: text(data.backgroundColorId),
    carryAlways: boolean(data.carryAlways), marginPercent: number(data.marginPercent),
    progress: { row: number(progress.row), stitch: number(progress.stitch) }, tapStep: root.formatVersion === 2 && data.tapStep === 'color-run' ? 'color-run' : number(data.tapStep), updatedAt: text(data.updatedAt),
  };
  validateProject(project);
  for (const value of [project.progress.row, project.progress.stitch, ...(project.tapStep === 'color-run' ? [] : [project.tapStep])]) { requireInteger(value, 'El progreso'); requirePositive(value, 'El progreso'); }
  if (project.progress.row > rows || project.progress.stitch > cols + (root.formatVersion === 2 ? 1 : 0)) throw new Error('El progreso está fuera de la cuadrícula.');
  if (!Number.isFinite(Date.parse(project.updatedAt))) throw new Error('La fecha de edición no es válida.');
  if (project.profileId !== profile.id) throw new Error('El perfil no coincide con el proyecto.');
  return { formatVersion: root.formatVersion, project, profile };
}

export function exportProjectFile(project: ProjectRecord, profile: GaugeProfile): string {
  const source = JSON.stringify({ formatVersion: 2, project, profile }, null, 2);
  parseProjectFile(source);
  return source;
}

export function packProject(project: ProjectRecord): PackedProject {
  validateProject(project);
  return { ...project, cells: Uint8Array.from(project.cells) };
}

export function unpackProject(project: PackedProject): ProjectRecord {
  const unpacked = { ...project, cells: Array.from(project.cells) };
  validateProject(unpacked);
  return unpacked;
}
