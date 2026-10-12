import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILES } from './defaults';
import { createExampleProject, EXAMPLE_DRAWINGS } from './examples';
import { designBounds } from './grid';
import { validateProject } from './validation';

describe('original examples', () => {
  it('has four distinct named drawings, 16–28 stitches per side, two or three colors and a full background contour', () => {
    expect(EXAMPLE_DRAWINGS.map((drawing) => drawing.name)).toEqual([
      'Corazón',
      'Flor',
      'Ovejita',
      'Estrella',
    ]);
    for (const drawing of EXAMPLE_DRAWINGS) {
      expect(drawing.cols).toBeGreaterThanOrEqual(16);
      expect(drawing.cols).toBeLessThanOrEqual(28);
      expect(drawing.rows).toBeGreaterThanOrEqual(16);
      expect(drawing.rows).toBeLessThanOrEqual(28);
      expect(drawing.cells).toHaveLength(drawing.cols * drawing.rows);
      expect(drawing.palette.length).toBeGreaterThanOrEqual(2);
      expect(drawing.palette.length).toBeLessThanOrEqual(3);
      expect(new Set(drawing.cells).size).toBe(drawing.palette.length);
      drawing.cells.forEach((color, index) => {
        expect(drawing.palette[color]).toBeDefined();
        const col = index % drawing.cols;
        const row = Math.floor(index / drawing.cols);
        if (
          col === 0 ||
          row === 0 ||
          col === drawing.cols - 1 ||
          row === drawing.rows - 1
        )
          expect(color).toBe(0);
      });
    }
  });
  it('creates centered 30 cm pieces with the 4 mm gauge, without mutating the example', () => {
    for (const drawing of EXAMPLE_DRAWINGS) {
      const before = [...drawing.cells];
      const project = createExampleProject(
        drawing,
        DEFAULT_PROFILES[1]!,
        'unique-project',
      );
      expect(() => validateProject(project)).not.toThrow();
      expect([project.cols, project.rows, project.profileId]).toEqual([
        48,
        54,
        'default-4mm',
      ]);
      const bounds = designBounds(project, 0)!;
      expect(bounds.left).toBe(Math.floor((48 - bounds.width) / 2));
      expect(bounds.bottom).toBe(Math.floor((54 - bounds.height) / 2));
      expect(project.cells.filter((color) => color !== 0).length).toBe(
        drawing.cells.filter((color) => color !== 0).length,
      );
      expect(drawing.cells).toEqual(before);
    }
  });
  it('rejects a gauge whose 30 cm piece cannot contain the drawing', () => {
    expect(() =>
      createExampleProject(
        EXAMPLE_DRAWINGS[0]!,
        { ...DEFAULT_PROFILES[1]!, swatchWidthCm: 1000 },
        'small',
      ),
    ).toThrow('no cabe');
  });
});
