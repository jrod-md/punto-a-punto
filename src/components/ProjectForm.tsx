import { createId } from '../storage/ids';
import { useState } from 'react';
import { gauge } from '../core/gauge';
import { sizing } from '../core/sizing';
import { validateEditorSize } from '../core/projectFile';
import type { GaugeProfile, ProjectRecord } from '../core/types';

interface Props {
  profiles: GaugeProfile[];
  onCreate(project: ProjectRecord): void;
}

export default function ProjectForm({ profiles, onCreate }: Props) {
  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState(
    profiles.find((entry) => entry.hookMm === 4)?.id ?? profiles[0]?.id ?? '',
  );
  const [construction, setConstruction] = useState<'flat' | 'round'>('flat');
  const [unit, setUnit] = useState<'cm' | 'stitches'>('cm');
  const [width, setWidth] = useState('40');
  const [height, setHeight] = useState('40');
  const [error, setError] = useState('');
  const profile = profiles.find((entry) => entry.id === profileId);
  let result: {
    cols: number;
    rows: number;
    realWidthCm: number;
    realHeightCm: number;
  } | null = null;
  let sizeError = '';
  try {
    if (!profile || width === '' || height === '')
      throw new Error('Completa las medidas y elige una muestra.');
    const measures = gauge(profile);
    result =
      unit === 'cm'
        ? sizing(profile, Number(width), Number(height))
        : {
            cols: Number(width),
            rows: Number(height),
            realWidthCm: Number(width) * measures.stitchWidthCm,
            realHeightCm: Number(height) * measures.rowHeightCm,
          };
    validateEditorSize(result.cols, result.rows);
  } catch (reason) {
    sizeError =
      reason instanceof Error ? reason.message : 'Revisa las medidas.';
    result = null;
  }
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError('Escribe un nombre para tu proyecto.');
          return;
        }
        if (!result || !profile) {
          setError(sizeError);
          return;
        }
        const backgroundId = createId();
        onCreate({
          id: createId(),
          name: name.trim(),
          profileId,
          construction,
          cols: result.cols,
          rows: result.rows,
          cells: Array<number>(result.cols * result.rows).fill(0),
          palette: [
            { id: backgroundId, name: 'Blanco', hex: '#ffffff' },
            { id: createId(), name: 'Oscuro', hex: '#30382f' },
          ],
          backgroundColorId: backgroundId,
          carryAlways: false,
          marginPercent: 10,
          progress: { row: 1, stitch: 1 },
          tapStep: 5,
          updatedAt: new Date().toISOString(),
        });
      }}
    >
      <h1>Dibujar desde cero</h1>
      <label>
        Nombre del proyecto
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="Por ejemplo, manta de bebé"
          required
        />
      </label>
      <label>
        Perfil de muestra
        <select
          value={profileId}
          onChange={(event) => setProfileId(event.target.value)}
        >
          {profiles.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      {profile?.approximate && (
        <p className="notice">
          Esta muestra es aproximada. Una muestra propia ajustará los cálculos a
          tu hilo y tu aguja.
        </p>
      )}
      <label>
        Cómo vas a tejer
        <select
          value={construction}
          onChange={(event) =>
            setConstruction(event.target.value === 'round' ? 'round' : 'flat')
          }
        >
          <option value="flat">En plano</option>
          <option value="round">En redondo (espiral continua)</option>
        </select>
      </label>
      <fieldset>
        <legend>Indicar el tamaño en</legend>
        <div className="segmented">
          <button
            type="button"
            aria-pressed={unit === 'cm'}
            onClick={() => {
              setUnit('cm');
              setWidth('40');
              setHeight('40');
            }}
          >
            Centímetros
          </button>
          <button
            type="button"
            aria-pressed={unit === 'stitches'}
            onClick={() => {
              setUnit('stitches');
              setWidth('64');
              setHeight('72');
            }}
          >
            Puntos y filas
          </button>
        </div>
      </fieldset>
      <div className="field-pair">
        <label>
          {unit === 'cm' ? 'Ancho (cm)' : 'Puntos'}
          <input
            type="number"
            inputMode={unit === 'cm' ? 'decimal' : 'numeric'}
            min={unit === 'cm' ? 0 : 1}
            step={unit === 'cm' ? 'any' : 1}
            value={width}
            onChange={(event) => setWidth(event.target.value)}
            required
          />
        </label>
        <label>
          {unit === 'cm' ? 'Alto (cm)' : 'Filas'}
          <input
            type="number"
            inputMode={unit === 'cm' ? 'decimal' : 'numeric'}
            min={unit === 'cm' ? 0 : 1}
            step={unit === 'cm' ? 'any' : 1}
            value={height}
            onChange={(event) => setHeight(event.target.value)}
            required
          />
        </label>
      </div>
      <div className="size-preview" aria-live="polite">
        {result ? (
          <>
            <strong>
              {result.cols} puntos × {result.rows} filas
            </strong>
            <p>
              Tamaño real: {format.format(result.realWidthCm)} ×{' '}
              {format.format(result.realHeightCm)} cm
            </p>
          </>
        ) : (
          <p>{sizeError}</p>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary" disabled={!result}>
        Crear y dibujar
      </button>
    </form>
  );
}
