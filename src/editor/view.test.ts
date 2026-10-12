import { expect, it } from 'vitest';
import { completeView, openingView, resizedView, spacedLabels } from './view';
const viewport = { width: 359, height: 610, cols: 64, rows: 72, ratio: 8 / 9 };
it('opens 64 by 72 completely and 200 by 200 at row one centered horizontally', () => {
  expect(openingView(viewport).complete).toBe(true);
  const large = { ...viewport, cols: 200, rows: 200 };
  const view = openingView(large);
  expect(view.complete).toBe(false);
  expect(view.x + (large.cols * view.cellWidth) / 2).toBe(large.width / 2);
  expect(view.y + large.rows * view.cellWidth * large.ratio).toBe(
    large.height - 32,
  );
});
it('refits complete views and preserves the viewed center for zoomed views and gauge changes', () => {
  const next = { ...viewport, width: 796, height: 200, ratio: 1.2 };
  expect(resizedView(completeView(viewport), viewport, next)).toEqual(
    completeView(next),
  );
  const view = { cellWidth: 18, x: -200, y: -100, complete: false };
  const resized = resizedView(view, viewport, next);
  expect((next.width / 2 - resized.x) / resized.cellWidth).toBeCloseTo(
    (viewport.width / 2 - view.x) / view.cellWidth,
  );
  expect(
    next.rows -
      (next.height / 2 - resized.y) / (resized.cellWidth * next.ratio),
  ).toBeCloseTo(
    viewport.rows -
      (viewport.height / 2 - view.y) / (view.cellWidth * viewport.ratio),
  );
});
it('keeps endpoint 72 and suppresses overlapping 70; preserves separated labels', () => {
  expect(
    spacedLabels([
      { value: 72, position: 35, size: 12, edge: true },
      { value: 70, position: 43, size: 12, edge: false },
      { value: 60, position: 90, size: 12, edge: false },
    ]).map((l) => l.value),
  ).toEqual([72, 60]);
  expect(spacedLabels([])).toEqual([]);
  expect(
    spacedLabels([
      { value: 1, position: 10, size: 20, edge: true },
      { value: 5, position: 15, size: 20, edge: false },
      { value: 64, position: 100, size: 20, edge: true },
    ]),
  ).toHaveLength(2);
});
