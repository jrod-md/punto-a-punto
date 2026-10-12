import { gauge } from './gauge';
import { pattern } from './pattern';
import type { GaugeProfile, Project } from './types';
import { yarn } from './yarn';

export function patternHeading(
  project: Project,
  profile: GaugeProfile,
): string[] {
  const measures = gauge(profile);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
  const rowLabel = project.construction === 'round' ? 'vuelta' : 'fila';
  return [
    project.name,
    `${project.cols} ${project.cols === 1 ? 'punto' : 'puntos'} × ${project.rows} ${rowLabel}${project.rows === 1 ? '' : 's'}`,
    `Tamaño real: ${format.format(project.cols * measures.stitchWidthCm)} × ${format.format(project.rows * measures.rowHeightCm)} cm`,
    `Muestra: ${profile.name}`,
    project.construction === 'round'
      ? 'En redondo (espiral continua)'
      : 'En plano',
  ];
}

export function patternDocument(project: Project, profile: GaugeProfile) {
  const written = pattern(project);
  const heading = patternHeading(project, profile);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
  const meters = new Intl.NumberFormat('es', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const estimates = yarn(project, profile)
    .filter((entry) => entry.workedStitches > 0)
    .map((entry) => ({
      ...entry,
      color: project.palette.find((color) => color.id === entry.colorId)!,
    }));
  const totalMeters = estimates.reduce((sum, entry) => sum + entry.meters, 0);
  const warnings = [
    'Es una estimación, no una cantidad exacta. Incluye las colas de inicio y remate y el margen de seguridad.',
    ...(profile.approximate
      ? [
          'Esta muestra es aproximada. Calibra con tu hilo y tu aguja para mejorar la estimación.',
        ]
      : []),
    `Margen aplicado: ${format.format(project.marginPercent)} %.`,
    project.carryAlways
      ? 'Se llevan todos los colores usados en todas las filas.'
      : 'El hilo se lleva en las filas con varios colores.',
  ];
  const yarnLines = estimates.map(
    (entry) =>
      `${entry.color.name}: ${entry.workedStitches} puntos · ${meters.format(entry.meters)} m${entry.balls === undefined ? '' : ` · ${entry.balls} ${entry.balls === 1 ? 'ovillo' : 'ovillos'}`}`,
  );
  return {
    heading,
    written,
    estimates,
    warnings,
    totalMeters,
    text: [
      ...heading,
      '',
      'Leyenda',
      ...written.legend.map((entry) => `${entry.letter} → ${entry.name}`),
      '',
      'Hilo estimado',
      ...yarnLines,
      `Total estimado: ${meters.format(totalMeters)} m`,
      ...warnings,
      '',
      ...written.rows.map((row) => row.text),
    ].join('\n'),
  };
}

export interface GridTile {
  left: number;
  bottom: number;
  cols: number;
  rows: number;
}
export function gridTiles(
  cols: number,
  rows: number,
  maxCols: number,
  maxRows: number,
): GridTile[] {
  for (const value of [cols, rows, maxCols, maxRows])
    if (!Number.isSafeInteger(value) || value < 1)
      throw new RangeError(
        'El tamaño de las páginas debe ser un entero positivo.',
      );
  const tiles: GridTile[] = [];
  for (let bottom = 0; bottom < rows; bottom += maxRows)
    for (let left = 0; left < cols; left += maxCols)
      tiles.push({
        left,
        bottom,
        cols: Math.min(maxCols, cols - left),
        rows: Math.min(maxRows, rows - bottom),
      });
  return tiles;
}
