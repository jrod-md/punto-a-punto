import { useState } from 'react';
import { gauge } from '../core/gauge';
import type { Bounds } from '../core/grid';
import {
  placeStitchText,
  renderStitchText,
  suggestTextPosition,
} from '../core/text';
import type { TextPosition } from '../core/text';
import type { GaugeProfile, Project } from '../core/types';
import ImagePreview from './ImagePreview';

const POSITIONS: readonly (readonly [TextPosition, string])[] = [
  ['top', 'Arriba'],
  ['center', 'En el centro'],
  ['bottom', 'Abajo'],
];

export default function TextComposer({
  project,
  profile,
  initialColor,
  onCancel,
  onComplete,
}: {
  project: Project;
  profile: GaugeProfile;
  initialColor: number;
  onCancel(): void;
  onComplete(project: Project, selection: Bounds, color: number): void;
}) {
  const [text, setText] = useState('');
  const [scale, setScale] = useState(1);
  const [twoLines, setTwoLines] = useState(false);
  // Until she chooses, the text goes where it does not cover the drawing.
  const [chosenPosition, setChosenPosition] = useState<TextPosition | null>(
    null,
  );
  const [color, setColor] = useState(
    project.palette[initialColor]?.id !== project.backgroundColorId
      ? initialColor
      : Math.max(
          0,
          project.palette.findIndex(
            (entry) => entry.id !== project.backgroundColorId,
          ),
        ),
  );
  const drawing = renderStitchText(text, scale, twoLines);
  const position = chosenPosition ?? suggestTextPosition(project, drawing);
  const placement = placeStitchText(project, drawing, color, position);
  const preview = placement.project ?? project;
  const measures = gauge(profile);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
  const widthProblem = drawing.cols > project.cols;
  const heightProblem = drawing.rows > project.rows;
  const smaller = [2, 1].find(
    (size) =>
      size < scale &&
      placeStitchText(project, renderStitchText(text, size, twoLines), color)
        .project,
  );
  const splitFits =
    !twoLines &&
    placeStitchText(project, renderStitchText(text, scale, true), color)
      .project !== null;
  return (
    <main className="page narrow text-composer">
      <header className="flow-bar">
        <button
          className="quiet"
          aria-label="Volver al editor"
          onClick={onCancel}
        >
          ←
        </button>
        <h1>Escribir texto</h1>
      </header>
      <div className="stage">
        <ImagePreview
          drawing={{
            ...preview,
            palette: [...preview.palette],
            background: preview.palette.findIndex(
              (entry) => entry.id === preview.backgroundColorId,
            ),
          }}
          stitchRatio={measures.rowHeightCm / measures.stitchWidthCm}
        />
      </div>
      <p className="stage-summary" role="status">
        {drawing.cols
          ? `Mide ${format.format(drawing.cols * measures.stitchWidthCm)} × ${format.format(drawing.rows * measures.rowHeightCm)} cm (${drawing.cols} puntos × ${drawing.rows} filas).`
          : 'Escribe un nombre o una fecha para verlo sobre la pieza.'}
      </p>
      <label>
        Texto para tejer
        <input
          value={text}
          maxLength={120}
          onChange={(event) => setText(event.target.value)}
          placeholder="Por ejemplo, LUCÍA"
        />
      </label>
      <p className="adjust-label" id="text-color-label">
        Color del texto
      </p>
      <div className="swatches" role="group" aria-labelledby="text-color-label">
        {project.palette.map((entry, index) => (
          <button
            key={entry.id}
            aria-pressed={index === color}
            aria-label={entry.name}
            onClick={() => setColor(index)}
          >
            <span
              className="color-dot"
              style={{ backgroundColor: entry.hex }}
            />
          </button>
        ))}
      </div>
      <p className="adjust-label" id="text-size-label">
        Tamaño del texto
      </p>
      <div
        className="segmented wide"
        role="group"
        aria-labelledby="text-size-label"
      >
        {['Normal', 'Doble', 'Triple'].map((label, index) => (
          <button
            key={label}
            aria-pressed={scale === index + 1}
            onClick={() => setScale(index + 1)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="adjust-label" id="text-place-label">
        Dónde va
      </p>
      <div
        className="segmented wide"
        role="group"
        aria-labelledby="text-place-label"
      >
        {POSITIONS.map(([value, label]) => (
          <button
            key={value}
            aria-pressed={position === value}
            onClick={() => setChosenPosition(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {drawing.omitted.length > 0 && (
        <p className="notice" role="status">
          Se omiten estos caracteres:{' '}
          {drawing.omitted.map((character) => `«${character}»`).join(', ')}.
        </p>
      )}
      {text.trim() && placement.reason && (
        <div className="notice" role="alert">
          <p>{placement.reason}</p>
          {(widthProblem || heightProblem) && (
            <div className="page-actions">
              {smaller !== undefined && (
                <button onClick={() => setScale(smaller)}>
                  Usar tamaño {smaller === 1 ? 'normal' : 'doble'}
                </button>
              )}
              {widthProblem && splitFits && (
                <button onClick={() => setTwoLines(true)}>
                  Partir en dos líneas
                </button>
              )}
              {smaller === undefined && !splitFits && (
                <p>Acorta el texto para que quepa.</p>
              )}
            </div>
          )}
        </div>
      )}
      {twoLines && (
        <button onClick={() => setTwoLines(false)}>Volver a una línea</button>
      )}
      <footer className="flow-actions">
        <button
          className="primary"
          disabled={!placement.project}
          onClick={() => {
            if (placement.project && placement.selection)
              onComplete(placement.project, placement.selection, color);
          }}
        >
          Añadir al proyecto
        </button>
      </footer>
    </main>
  );
}
