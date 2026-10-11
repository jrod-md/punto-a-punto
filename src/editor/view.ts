export interface View { cellWidth: number; x: number; y: number; complete: boolean }
export interface Viewport { width: number; height: number; cols: number; rows: number; ratio: number }
export const RULER_SIZE = 28;

export function completeView(viewport: Viewport): View {
  const { width, height, cols, rows, ratio } = viewport;
  const cellWidth = Math.max(0.01, Math.min(36, (width - RULER_SIZE * 2 - 8) / cols, (height - RULER_SIZE * 2 - 8) / (rows * ratio)));
  return { cellWidth, x: (width - cols * cellWidth) / 2, y: (height - rows * cellWidth * ratio) / 2, complete: true };
}

export function openingView(viewport: Viewport): View {
  const full = completeView(viewport);
  if (Math.min(full.cellWidth, full.cellWidth * viewport.ratio) >= 3) return full;
  const cellWidth = Math.max(12, 12 / viewport.ratio);
  return { cellWidth, x: (viewport.width - viewport.cols * cellWidth) / 2,
    y: viewport.height - RULER_SIZE - 4 - viewport.rows * cellWidth * viewport.ratio, complete: false };
}

export function resizedView(view: View, previous: Viewport, next: Viewport): View {
  if (view.complete) return completeView(next);
  const colAtCenter = (previous.width / 2 - view.x) / view.cellWidth;
  const rowFromBottom = previous.rows - (previous.height / 2 - view.y) / (view.cellWidth * previous.ratio);
  return { ...view, x: next.width / 2 - colAtCenter * view.cellWidth,
    y: next.height / 2 - (next.rows - rowFromBottom) * view.cellWidth * next.ratio };
}

export interface RulerLabel { value: number; position: number; size: number; edge: boolean }
export function spacedLabels(candidates: readonly RulerLabel[]): RulerLabel[] {
  const result: RulerLabel[] = [];
  for (const candidate of [...candidates].sort((a, b) => Number(b.edge) - Number(a.edge) || a.position - b.position)) {
    if (result.every((label) => Math.abs(label.position - candidate.position) >= (label.size + candidate.size) / 2 + 4)) result.push(candidate);
  }
  return result.sort((a, b) => a.position - b.position);
}
