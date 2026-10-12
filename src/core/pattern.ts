import type { Project } from './types';
import { validateProject } from './validation';

export interface PatternRun {
  letter: string;
  colorId: string;
  count: number;
}

export interface PatternRow {
  row: number;
  direction: 'right-to-left' | 'left-to-right';
  runs: PatternRun[];
  total: number;
  text: string;
}

export interface WrittenPattern {
  legend: { letter: string; colorId: string; name: string }[];
  rows: PatternRow[];
  text: string;
}

export function pattern(project: Project): WrittenPattern {
  validateProject(project);
  const legend = project.palette.map((color, index) => ({
    letter: String.fromCharCode(65 + index),
    colorId: color.id,
    name: color.name,
  }));
  const rows: PatternRow[] = [];
  for (let row = 0; row < project.rows; row += 1) {
    const rightToLeft = project.construction === 'round' || row % 2 === 0;
    const cells = project.cells.slice(
      row * project.cols,
      (row + 1) * project.cols,
    );
    if (rightToLeft) cells.reverse();
    const runs: PatternRun[] = [];
    for (const colorIndex of cells) {
      const color = legend[colorIndex];
      if (!color)
        throw new RangeError('El color de la celda no está en la paleta.');
      const lastRun = runs.at(-1);
      if (lastRun?.colorId === color.colorId) lastRun.count += 1;
      else
        runs.push({ letter: color.letter, colorId: color.colorId, count: 1 });
    }
    const label = project.construction === 'round' ? 'Vuelta' : 'Fila';
    const direction = rightToLeft ? 'right-to-left' : 'left-to-right';
    const directionText = rightToLeft
      ? '← derecha a izquierda'
      : '→ izquierda a derecha';
    const text = `${label} ${row + 1} (${directionText}): ${runs.map((run) => `${run.count} ${run.letter}`).join(', ')} — ${project.cols} puntos`;
    rows.push({ row: row + 1, direction, runs, total: project.cols, text });
  }
  return {
    legend,
    rows,
    text: [
      'Leyenda',
      ...legend.map((color) => `${color.letter} → ${color.name}`),
      '',
      ...rows.map((row) => row.text),
    ].join('\n'),
  };
}
