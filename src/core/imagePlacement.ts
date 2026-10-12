import { resizeProject } from './editor';
import { centerDesign, createGrid, designBounds } from './grid';
import type { CenterResult } from './grid';
import type { ImportedDrawing } from './imageImport';
import { validateEditorSize } from './projectFile';
import type { Project } from './types';
import { validateProject } from './validation';

export interface PlacementPlan {
  project: Project | null;
  centering: CenterResult;
  minimumCols: number;
  minimumRows: number;
  paletteSize: number;
  problem: 'size' | 'palette' | null;
}

// Explicit color mappings let the user merge imported colors into existing ones.
export function planImagePlacement(
  project: Project,
  drawing: ImportedDrawing,
  mappings: Readonly<Record<number, string>> = {},
  grow = false,
): PlacementPlan {
  validateProject(project);
  validateEditorSize(drawing.cols, drawing.rows);
  if (drawing.background === null)
    throw new RangeError('Elige un color de fondo antes de colocar el dibujo.');
  const imageBackground = drawing.background;
  if (
    !drawing.palette[drawing.background] ||
    drawing.cells.some((v) => !drawing.palette[v])
  )
    throw new RangeError('El dibujo tiene una paleta incompleta.');
  const background = project.palette.findIndex(
    (entry) => entry.id === project.backgroundColorId,
  );
  const visibleDrawing = {
    ...drawing,
    cells: drawing.cells.map((color) =>
      mappings[color] === project.backgroundColorId ? imageBackground : color,
    ),
  };
  const bounds = designBounds(visibleDrawing, drawing.background);
  const minimumCols = Math.max(project.cols, bounds?.width ?? 1);
  const minimumRows = Math.max(project.rows, bounds?.height ?? 1);
  const destination = grow
    ? resizeProject(project, minimumCols, minimumRows).project
    : project;
  const centering = centerDesign(
    visibleDrawing,
    drawing.background,
    createGrid(destination.cols, destination.rows, drawing.background),
  );
  const palette = [...project.palette];
  const indices = drawing.palette.map((entry, index) => {
    if (index === drawing.background) return background;
    const mapped = mappings[index];
    if (mapped && !palette.some((color) => color.id === mapped))
      throw new RangeError('El color elegido para fusionar ya no existe.');
    const existing = palette.findIndex((color) =>
      mapped
        ? color.id === mapped
        : color.hex.toLowerCase() === entry.hex.toLowerCase(),
    );
    if (existing >= 0) return existing;
    let suffix = palette.length;
    while (palette.some((color) => color.id === `import-${suffix}`))
      suffix += 1;
    palette.push({ ...entry, id: `import-${suffix}` });
    return palette.length - 1;
  });
  const base = {
    centering,
    minimumCols,
    minimumRows,
    paletteSize: palette.length,
  };
  if (palette.length > 12)
    return { ...base, project: null, problem: 'palette' };
  if (bounds && !centering.moved)
    return { ...base, project: null, problem: 'size' };
  const cells = [...destination.cells];
  if (centering.moved) {
    centering.grid.cells.forEach((color, index) => {
      if (color !== drawing.background) cells[index] = indices[color]!;
    });
  }
  return {
    ...base,
    project: { ...destination, palette, cells },
    problem: null,
  };
}

export function fitDrawingWidth(
  cols: number,
  rows: number,
  margin: number,
): number {
  validateEditorSize(cols, rows);
  if (
    !Number.isInteger(margin) ||
    margin < 0 ||
    margin * 2 >= Math.min(cols, rows)
  )
    throw new RangeError(
      'El margen debe dejar al menos un punto en ambos lados.',
    );
  // Bound both sides: the longest side cannot silently exceed the piece height.
  return cols - margin * 2;
}
