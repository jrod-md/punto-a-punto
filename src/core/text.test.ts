import { describe, expect, it } from 'vitest';
import { commitHistory, createHistory, undoHistory } from './editor';
import {
  placeStitchText,
  renderStitchText,
  STITCH_FONT,
  suggestTextPosition,
} from './text';
import { TEST_PROJECT } from './testFixtures';

const piece = {
  ...TEST_PROJECT,
  cols: 64,
  rows: 32,
  cells: Array<number>(64 * 32).fill(0),
};

describe('original stitch font', () => {
  it('covers all requested characters with nonempty 5 × 7 glyphs except space', () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑÁÉÍÓÚÜ0123456789 .,-!?♥';
    expect(Object.keys(STITCH_FONT).sort()).toEqual([...characters].sort());
    for (const character of characters) {
      const glyph = STITCH_FONT[character]!;
      expect(glyph).toHaveLength(7);
      expect(glyph.every((line) => /^[.#]{5}$/.test(line))).toBe(true);
      expect(glyph.some((line) => line.includes('#'))).toBe(character !== ' ');
    }
  });
  it('ANA has one stitch between letters and measures 17 × 7', () => {
    const text = renderStitchText('ana');
    expect([text.cols, text.rows]).toEqual([17, 7]);
    expect(text.lines).toEqual(['ANA']);
    for (let row = 0; row < 7; row += 1) {
      expect(text.cells[row * 17 + 5]).toBe(false);
      expect(text.cells[row * 17 + 11]).toBe(false);
    }
  });
  it('scales every stitch into exact 2 × 2 and 3 × 3 blocks', () => {
    const normal = renderStitchText('LUCÍA ♥');
    for (const scale of [2, 3]) {
      const enlarged = renderStitchText('LUCÍA ♥', scale);
      expect([enlarged.cols, enlarged.rows]).toEqual([
        normal.cols * scale,
        normal.rows * scale,
      ]);
      normal.cells.forEach((painted, index) => {
        for (let dy = 0; dy < scale; dy += 1)
          for (let dx = 0; dx < scale; dx += 1)
            expect(
              enlarged.cells[
                (Math.floor(index / normal.cols) * scale + dy) * enlarged.cols +
                  (index % normal.cols) * scale +
                  dx
              ],
            ).toBe(painted);
      });
    }
  });
  it('normalizes accents, omits unsupported characters and reports each once', () => {
    expect(renderStitchText('lucíA')).toEqual(renderStitchText('Luci\u0301a'));
    const result = renderStitchText('a🙂🙂@ß');
    expect(result.lines).toEqual(['A']);
    expect(result.omitted).toEqual(['🙂', '@', 'ß']);
    expect(renderStitchText(' 🙂 ')).toMatchObject({
      cols: 0,
      rows: 0,
      cells: [],
    });
    expect(() => renderStitchText('A', 0)).toThrow();
    expect(() => renderStitchText('A', 1.5)).toThrow();
  });
  it('splits a name or two words into two centered lines with one empty row', () => {
    expect(renderStitchText('LUCÍA', 2, true)).toMatchObject({
      cols: 34,
      rows: 30,
      lines: ['LUC', 'ÍA'],
    });
    expect(renderStitchText('ANA MARÍA', 1, true).lines).toEqual([
      'ANA',
      'MARÍA',
    ]);
    expect(renderStitchText('A', 1, true).rows).toBe(7);
  });
});

describe('placing text', () => {
  it('rejects width, height, empty text and invisible background without changing the piece', () => {
    const source = [...piece.cells];
    expect(
      placeStitchText(TEST_PROJECT, renderStitchText('ANA'), 1),
    ).toMatchObject({
      project: null,
      selection: null,
      reason: expect.stringContaining('ancho'),
    });
    expect(
      placeStitchText(
        { ...piece, rows: 2, cells: piece.cells.slice(0, 128) },
        renderStitchText('ANA'),
        1,
      ).reason,
    ).toContain('alto');
    expect(placeStitchText(piece, renderStitchText(' '), 1).project).toBeNull();
    expect(placeStitchText(piece, renderStitchText('A'), 0).reason).toContain(
      'fondo',
    );
    expect(() => placeStitchText(piece, renderStitchText('A'), 5)).toThrow();
    expect(piece.cells).toEqual(source);
  });
  it('centers LUCÍA double, preserves underlying stitches in gaps and undoes in one step', () => {
    const original = {
      ...piece,
      cells: piece.cells.map((value, index) => (index === 0 ? 2 : value)),
    };
    const text = renderStitchText('LUCÍA', 2);
    const result = placeStitchText(original, text, 1);
    expect(result.selection).toEqual({
      left: 3,
      bottom: 9,
      width: 58,
      height: 14,
    });
    expect(result.project!.cells[0]).toBe(2);
    text.cells.forEach((painted, index) => {
      expect(
        result.project!.cells[
          (9 + Math.floor(index / 58)) * 64 + 3 + (index % 58)
        ],
      ).toBe(painted ? 1 : 0);
    });
    const history = commitHistory(createHistory(original), result.project!);
    expect(history.past).toHaveLength(1);
    expect(undoHistory(history).present).toBe(original);
  });
  it('places text below or above the middle with a margin', () => {
    const text = renderStitchText('ANA');
    expect(placeStitchText(piece, text, 1, 'bottom').selection).toMatchObject({
      left: 23,
      bottom: 3,
    });
    expect(placeStitchText(piece, text, 1, 'top').selection).toMatchObject({
      left: 23,
      bottom: 22,
    });
    const tight = { ...piece, rows: 8, cells: piece.cells.slice(0, 512) };
    expect(placeStitchText(tight, text, 1, 'bottom').selection!.bottom).toBe(0);
    expect(placeStitchText(tight, text, 1, 'top').selection!.bottom).toBe(1);
  });
  it('suggests a place that does not cover the drawing', () => {
    const text = renderStitchText('ANA');
    expect(suggestTextPosition(piece, text)).toBe('center');
    const paint = (rows: readonly number[]) => ({
      ...piece,
      cells: piece.cells.map((value, index) =>
        rows.includes(Math.floor(index / 64)) && index % 64 === 30 ? 2 : value,
      ),
    });
    expect(suggestTextPosition(paint([15]), text)).toBe('bottom');
    expect(suggestTextPosition(paint([15, 5]), text)).toBe('top');
    expect(suggestTextPosition(paint([15, 5, 25]), text)).toBe('center');
    expect(suggestTextPosition(piece, renderStitchText('LUCÍA', 3))).toBe(
      'center',
    );
  });
});
