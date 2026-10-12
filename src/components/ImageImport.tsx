import { useEffect, useMemo, useRef, useState } from 'react';
import { gauge } from '../core/gauge';
import { designBounds } from '../core/grid';
import {
  manualMesh,
  mergeDrawingColors,
  photoMesh,
  scaleDrawing,
} from '../core/imageImport';
import type {
  Crop,
  GridInspection,
  ImageMesh,
  ImportedDrawing,
  PixelImage,
  Rgba,
} from '../core/imageImport';
import { fitDrawingWidth, planImagePlacement } from '../core/imagePlacement';
import { validateEditorSize } from '../core/projectFile';
import { sizing } from '../core/sizing';
import type { GaugeProfile, Project } from '../core/types';
import { ImageJobs } from '../import/imageJobs';
import type { ImageJob } from '../import/imageJobs';
import { createId } from '../storage/ids';
import ImagePreview from './ImagePreview';

interface Props {
  profiles: GaugeProfile[];
  project?: Project;
  onCancel(): void;
  onComplete(project: Project): void;
}
const titles = [
  'Elegir imagen',
  'Recortar el dibujo',
  'Cuadros del dibujo',
  'Elegir los colores',
  'Tu dibujo y tu muestra',
  'Colocar en la pieza',
];

export default function ImageImport({
  profiles,
  project,
  onCancel,
  onComplete,
}: Props) {
  const [step, setStep] = useState(0);
  const [image, setImage] = useState<PixelImage>();
  const [cropped, setCropped] = useState<PixelImage>();
  const [crop, setCrop] = useState<Crop>();
  const [mesh, setMesh] = useState<ImageMesh>();
  const [inspection, setInspection] = useState<GridInspection>();
  const [gridPreview, setGridPreview] = useState<{
    mesh: ImageMesh;
    drawing: ImportedDrawing;
  }>();
  const [previewPending, setPreviewPending] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [cols, setCols] = useState('20');
  const [rows, setRows] = useState('24');
  const [drawing, setDrawing] = useState<ImportedDrawing>();
  const [samples, setSamples] = useState<Rgba[]>([]);
  const [maximum, setMaximum] = useState(12);
  const [mergeFrom, setMergeFrom] = useState(0);
  const [mergeTo, setMergeTo] = useState(1);
  const [profileId, setProfileId] = useState(
    project?.profileId ??
      profiles.find((p) => p.hookMm === 4)?.id ??
      profiles[0]!.id,
  );
  const [name, setName] = useState('Mi diseño');
  const [construction, setConstruction] = useState<'flat' | 'round'>('flat');
  const [unit, setUnit] = useState<'cm' | 'stitches'>('cm');
  const [width, setWidth] = useState('40');
  const [height, setHeight] = useState('40');
  const [scale, setScale] = useState('1');
  const [margin, setMargin] = useState('0');
  const [grow, setGrow] = useState(false);
  const [mappings, setMappings] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const jobs = useRef<ImageJobs | null>(null);
  const request = useRef(0);
  const mounted = useRef(true);
  const drag = useRef<{ corner: 'start' | 'end'; crop: Crop } | null>(null);
  const confirmedCounts = useRef<{ cols?: number; rows?: number }>({});
  const cropRef = useRef<HTMLDivElement>(null);
  const profile = profiles.find((p) => p.id === profileId)!;
  const { stitchWidthCm, rowHeightCm } = gauge(profile);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

  useEffect(() => {
    mounted.current = true;
    jobs.current = new ImageJobs();
    return () => {
      mounted.current = false;
      jobs.current?.dispose();
      jobs.current = null;
    };
  }, []);

  async function run(job: ImageJob) {
    const serial = ++request.current;
    setError('');
    setBusy('Preparando la imagen…');
    try {
      const result = await jobs.current!.run(job, (message) => {
        if (mounted.current && serial === request.current) setBusy(message);
      });
      return mounted.current && serial === request.current ? result : undefined;
    } catch (reason) {
      if (mounted.current && serial === request.current)
        setError(
          reason instanceof Error
            ? reason.message
            : 'No se pudo procesar la imagen.',
        );
      return undefined;
    } finally {
      if (mounted.current && serial === request.current) setBusy('');
    }
  }

  const meshState = useMemo(() => {
    try {
      if (!cropped || step < 2) return { mesh, error: '' };
      if (!cols || (!photo && !rows))
        throw new Error('Completa los dos números de cuadros.');
      const value = photo
        ? photoMesh(cropped, Number(cols), stitchWidthCm, rowHeightCm)
        : mesh?.cols === Number(cols) && mesh.rows === Number(rows)
          ? mesh
          : manualMesh(cropped, Number(cols), Number(rows));
      return { mesh: value, error: '' };
    } catch (reason) {
      return {
        mesh: undefined,
        error: reason instanceof Error ? reason.message : 'Revisa la rejilla.',
      };
    }
  }, [cropped, step, cols, rows, photo, mesh, stitchWidthCm, rowHeightCm]);
  const currentMesh = meshState.mesh;
  const meshError = meshState.error;

  useEffect(() => {
    if (step !== 2 || !cropped || !currentMesh) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setPreviewPending(true);
      void jobs
        .current!.run(
          { kind: 'sample', image: cropped, mesh: currentMesh, maximum },
          () => {},
        )
        .then((result) => {
          if (!cancelled && result.drawing)
            setGridPreview({ mesh: currentMesh, drawing: result.drawing });
        })
        .catch(() => {
          if (!cancelled)
            setError(
              'No se pudo preparar la comprobación del dibujo. Revisa los números de cuadros.',
            );
        })
        .finally(() => {
          if (!cancelled) setPreviewPending(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, cropped, currentMesh, maximum]);

  function correctCount(axis: 'cols' | 'rows', value: string) {
    if (axis === 'cols') setCols(value);
    else setRows(value);
    const count = Number(value);
    if (
      !cropped ||
      !value ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 1000
    ) {
      delete confirmedCounts.current[axis];
      return;
    }
    confirmedCounts.current[axis] = count;
    void run({ kind: 'inspect', image: cropped, hint: { [axis]: count } }).then(
      (result) => {
        if (!result) return;
        setMesh(result.mesh ?? undefined);
        if (axis === 'cols') {
          if (result.mesh) setRows(String(result.mesh.rows));
          else if (confirmedCounts.current.rows === undefined) setRows('');
        } else {
          if (result.mesh) setCols(String(result.mesh.cols));
          else if (confirmedCounts.current.cols === undefined) setCols('');
        }
      },
    );
  }

  async function readGrid() {
    if (!cropped || !currentMesh) return;
    const result = await run({
      kind: 'sample',
      image: cropped,
      mesh: currentMesh,
      maximum,
    });
    if (!result?.drawing || !result.samples) return;
    setDrawing(result.drawing);
    setSamples(result.samples);
    setMaximum(Math.max(2, result.drawing.palette.length));
    setMergeFrom(0);
    setMergeTo(Math.min(1, result.drawing.palette.length - 1));
    setStep(3);
  }

  async function changeMaximum(value: number) {
    setMaximum(value);
    if (!drawing) return;
    const result = await run({
      kind: 'colors',
      samples,
      cols: drawing.cols,
      rows: drawing.rows,
      maximum: value,
    });
    if (result?.drawing) {
      setDrawing(result.drawing);
      setMergeFrom(0);
      setMergeTo(Math.min(1, result.drawing.palette.length - 1));
    }
  }

  let placement: ReturnType<typeof planImagePlacement> | undefined;
  let scaled: ImportedDrawing | undefined;
  let placementError = '';
  let fractional = false;
  let base: Project | undefined;
  if (drawing && step === 5) {
    try {
      const size = project
        ? { cols: project.cols, rows: project.rows }
        : unit === 'cm'
          ? sizing(profile, Number(width), Number(height))
          : { cols: Number(width), rows: Number(height) };
      if (
        !project &&
        (!width || !height || Number(width) <= 0 || Number(height) <= 0)
      )
        throw new Error('Escribe dos medidas positivas.');
      validateEditorSize(size.cols, size.rows);
      base = project ?? {
        id: 'new-image-project',
        name,
        profileId,
        construction,
        cols: size.cols,
        rows: size.rows,
        cells: Array<number>(size.cols * size.rows).fill(drawing.background),
        palette: drawing.palette,
        backgroundColorId: drawing.palette[drawing.background]!.id,
        carryAlways: false,
        marginPercent: 10,
        progress: { row: 1, stitch: 1 },
        tapStep: 5,
      };
      const target =
        scale === 'fit'
          ? Math.max(
              1,
              Math.min(
                fitDrawingWidth(size.cols, size.rows, Number(margin)),
                Math.floor(
                  ((size.rows - Number(margin) * 2) * drawing.cols) /
                    drawing.rows,
                ),
              ),
            )
          : drawing.cols * Number(scale);
      scaled = scaleDrawing(drawing, target);
      fractional = scale === 'fit' && !Number.isInteger(target / drawing.cols);
      placement = planImagePlacement(base, scaled, mappings, grow);
    } catch (reason) {
      placementError =
        reason instanceof Error
          ? reason.message
          : 'Revisa las medidas de la pieza.';
    }
  }
  const bounds = scaled
    ? designBounds(placement?.centering.grid ?? scaled, scaled.background)
    : null;
  const report = placement?.centering.margins;
  const scaledPreview =
    scaled && project
      ? {
          ...scaled,
          palette: scaled.palette.map((entry, i) => {
            const id =
              i === scaled.background ? project.backgroundColorId : mappings[i];
            return project.palette.find((color) => color.id === id) ?? entry;
          }),
        }
      : scaled;
  const profileSelect = !project && (
    <label>
      Muestra para tejer
      <select
        value={profileId}
        disabled={photo && step !== 2}
        onChange={(e) => setProfileId(e.target.value)}
      >
        {profiles.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
    </label>
  );

  function moveCrop(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drag.current || !image || !cropRef.current) return;
    const rect = cropRef.current.getBoundingClientRect();
    const x = Math.round(
      Math.max(
        0,
        Math.min(
          image.width,
          ((event.clientX - rect.left) * image.width) / rect.width,
        ),
      ),
    );
    const y = Math.round(
      Math.max(
        0,
        Math.min(
          image.height,
          ((event.clientY - rect.top) * image.height) / rect.height,
        ),
      ),
    );
    const original = drag.current.crop;
    if (drag.current.corner === 'start') {
      const left = Math.min(x, original.x + original.width - 1);
      const top = Math.min(y, original.y + original.height - 1);
      setCrop({
        x: left,
        y: top,
        width: original.x + original.width - left,
        height: original.y + original.height - top,
      });
    } else
      setCrop({
        ...original,
        width: Math.max(1, x - original.x),
        height: Math.max(1, y - original.y),
      });
  }

  return (
    <section className="image-import" aria-label="Importar imagen">
      <header className="import-heading">
        <button onClick={onCancel}>Cancelar</button>
        <p className="eyebrow">IMAGEN · PASO {step + 1} DE 6</p>
      </header>
      <h1>{titles[step]}</h1>
      {busy && (
        <div className="notice" role="status">
          <p>{busy}</p>
          <progress aria-label="Procesando la imagen" />
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {step === 0 && (
        <>
          <p>
            Abre una captura de un patrón o un dibujo. Todo se procesa aquí; tu
            imagen no sale de este dispositivo.
          </p>
          <label className="file-button primary">
            Elegir imagen
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
              disabled={Boolean(busy)}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                if (file.size > 64 * 1024 * 1024) {
                  setError(
                    'El archivo supera 64 MB. Guarda una copia más pequeña.',
                  );
                  return;
                }
                void run({ kind: 'decode', file }).then((result) => {
                  if (!result?.image) return;
                  setImage(result.image);
                  setCrop(result.crop);
                  setStep(1);
                });
              }}
            />
          </label>
          <p className="subtle">
            Las imágenes grandes se reducen a un máximo de 1600 píxeles por lado
            antes del análisis.
          </p>
        </>
      )}
      {step === 1 && image && crop && (
        <>
          <p>
            Deja solo el dibujo, sin números ni texto. Arrastra las dos esquinas
            del marco o afina el recorte con las medidas de abajo.
          </p>
          <div className="crop-preview" ref={cropRef}>
            <ImagePreview image={image} crop={crop} />
            {(['start', 'end'] as const).map((corner) => (
              <button
                key={corner}
                className="crop-handle"
                aria-label={
                  corner === 'start'
                    ? 'Esquina superior izquierda del recorte'
                    : 'Esquina inferior derecha del recorte'
                }
                style={{
                  left: `clamp(22px, ${((corner === 'start' ? crop.x : crop.x + crop.width) / image.width) * 100}%, calc(100% - 22px))`,
                  top: `clamp(22px, ${((corner === 'start' ? crop.y : crop.y + crop.height) / image.height) * 100}%, calc(100% - 22px))`,
                }}
                onPointerDown={(e) => {
                  drag.current = { corner, crop };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={moveCrop}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                ⌖
              </button>
            ))}
          </div>
          <button
            disabled={Boolean(busy)}
            onClick={() => {
              void run({ kind: 'rotate', image }).then((result) => {
                if (result?.image) {
                  setImage(result.image);
                  setCrop(result.crop);
                }
              });
            }}
          >
            Girar 90°
          </button>
          <div className="import-fields">
            {(['x', 'y', 'width', 'height'] as const).map((field) => (
              <label key={field}>
                {
                  {
                    x: 'Desde la izquierda (px)',
                    y: 'Desde arriba (px)',
                    width: 'Ancho del recorte (px)',
                    height: 'Alto del recorte (px)',
                  }[field]
                }
                <input
                  type="number"
                  min={field === 'x' || field === 'y' ? 0 : 1}
                  max={
                    field === 'x' || field === 'width'
                      ? image.width
                      : image.height
                  }
                  value={crop[field]}
                  onChange={(e) => {
                    const value = Math.round(Number(e.target.value));
                    const next = {
                      ...crop,
                      [field]: Math.max(
                        field === 'x' || field === 'y' ? 0 : 1,
                        value,
                      ),
                    };
                    next.x = Math.min(next.x, image.width - 1);
                    next.y = Math.min(next.y, image.height - 1);
                    next.width = Math.min(next.width, image.width - next.x);
                    next.height = Math.min(next.height, image.height - next.y);
                    setCrop(next);
                  }}
                />
              </label>
            ))}
          </div>
          <button
            className="primary"
            disabled={Boolean(busy)}
            onClick={() => {
              void run({ kind: 'detect', image, crop }).then((result) => {
                if (!result?.image) return;
                setCropped(result.image);
                setMesh(result.mesh ?? undefined);
                setInspection(result.inspection);
                confirmedCounts.current = {};
                const isPhoto = result.inspection?.kind === 'photo';
                setPhoto(isPhoto);
                setCols(
                  result.mesh ? String(result.mesh.cols) : isPhoto ? '60' : '',
                );
                setRows(result.mesh ? String(result.mesh.rows) : '');
                setStep(2);
              });
            }}
          >
            Usar este recorte
          </button>
        </>
      )}
      {step === 2 && cropped && (
        <>
          {photo ? (
            <p className="notice">
              No se encontraron cuadros: esta imagen no parece pixel art. Elige
              el ancho en puntos; conservaremos la proporción al tejer. Hará
              falta retocar el resultado en el editor.
            </p>
          ) : inspection?.kind === 'uncertain' ? (
            <p className="notice">
              No pude confirmar una rejilla en ambos ejes. Indica los cuadros de
              ancho y de alto; con uno de tus números intentaré encontrar el
              otro. Comprueba el dibujo leído antes de continuar.
            </p>
          ) : (
            <p>
              Comprueba que las líneas naranjas coinciden con los cuadros.
              Corrige los números si hace falta; la rejilla se actualiza al
              momento.
            </p>
          )}
          {!photo &&
            (inspection?.small ||
              (currentMesh &&
                Math.min(
                  cropped.width / currentMesh.cols,
                  cropped.height / currentMesh.rows,
                ) < 6)) && (
              <p className="notice">
                La imagen es muy pequeña para leer los cuadros con seguridad
                (menos de unos 6 px por cuadro). Intenta usar la imagen original
                en vez de una captura de pantalla del chat. Aun así, puedes
                comprobar y continuar con esta.
              </p>
            )}
          <div className="mesh-comparison">
            <section>
              <h2>Imagen y rejilla</h2>
              <ImagePreview image={cropped} mesh={currentMesh} />
            </section>
            <section aria-label="Comprobación del dibujo leído">
              <h2>Dibujo leído</h2>
              {currentMesh &&
              gridPreview?.mesh === currentMesh &&
              !previewPending ? (
                <ImagePreview
                  drawing={gridPreview.drawing}
                  stitchRatio={rowHeightCm / stitchWidthCm}
                />
              ) : (
                <p role="status">
                  {currentMesh
                    ? 'Leyendo los cuadros para comprobar el dibujo…'
                    : 'Escribe ambos números para ver el dibujo leído.'}
                </p>
              )}
            </section>
          </div>
          <div className="import-fields">
            <label>
              {photo
                ? 'Ancho del resultado (puntos)'
                : inspection?.kind === 'uncertain'
                  ? '¿Cuántos cuadros tiene de ancho?'
                  : 'Cuadros de ancho'}
              <input
                type="number"
                min={1}
                max={1000}
                value={cols}
                onChange={(e) =>
                  photo
                    ? setCols(e.target.value)
                    : correctCount('cols', e.target.value)
                }
              />
            </label>
            {!photo && (
              <label>
                {inspection?.kind === 'uncertain'
                  ? '¿Cuántos de alto?'
                  : 'Cuadros de alto'}
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={rows}
                  onChange={(e) => correctCount('rows', e.target.value)}
                />
              </label>
            )}
          </div>
          {photo && (
            <>
              {profileSelect}
              <p>
                Resultado: {currentMesh?.cols ?? '—'} puntos ×{' '}
                {currentMesh?.rows ?? '—'} filas.
              </p>
              <button
                onClick={() => {
                  setPhoto(false);
                  setMesh(undefined);
                  setInspection({
                    mesh: null,
                    kind: 'uncertain',
                    small: false,
                  });
                  confirmedCounts.current = {};
                  setCols('');
                  setRows('');
                }}
              >
                La imagen sí tiene cuadros: corregir a mano
              </button>
            </>
          )}
          {!photo && (
            <button
              onClick={() => {
                setPhoto(true);
                setCols('60');
              }}
            >
              No es pixel art: conservar la proporción
            </button>
          )}
          {meshError && (cols !== '' || rows !== '' || photo) && (
            <p role="alert" className="error">
              {meshError}
            </p>
          )}
          <div className="import-actions">
            <button disabled={Boolean(busy)} onClick={() => setStep(1)}>
              ← Recorte
            </button>
            <button
              className="primary"
              disabled={Boolean(busy) || !currentMesh}
              onClick={() => {
                void readGrid();
              }}
            >
              Leer colores
            </button>
          </div>
        </>
      )}
      {step === 3 && drawing && (
        <>
          <ImagePreview drawing={drawing} />
          <label>
            Máximo de colores: {maximum}
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={maximum}
              onChange={(e) => {
                void changeMaximum(Number(e.target.value));
              }}
            />
          </label>
          <p>
            Se usan {drawing.palette.length} colores. Los tonos parecidos ya
            están unidos; puedes ajustar los nombres y el fondo.
          </p>
          <div className="import-colors">
            {drawing.palette.map((entry, i) => (
              <label key={entry.id}>
                <span
                  className="color-dot"
                  style={{ backgroundColor: entry.hex }}
                />
                <span className="sr-only">Nombre del color {i + 1}</span>
                <input
                  maxLength={60}
                  value={entry.name}
                  onChange={(e) =>
                    setDrawing({
                      ...drawing,
                      palette: drawing.palette.map((p, index) =>
                        index === i ? { ...p, name: e.target.value } : p,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Color de fondo
            <select
              value={drawing.background}
              onChange={(e) => {
                const background = Number(e.target.value);
                setDrawing({
                  ...drawing,
                  background,
                  cells: drawing.cells.map((v, i) =>
                    drawing.transparent?.[i] ? background : v,
                  ),
                });
              }}
            >
              {drawing.palette.map((entry, i) => (
                <option key={entry.id} value={i}>
                  {entry.name || `Color ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          {drawing.palette.length > 1 && (
            <fieldset>
              <legend>Fusionar dos colores</legend>
              <div className="import-fields">
                <label>
                  Color que se une
                  <select
                    value={mergeFrom}
                    onChange={(e) => setMergeFrom(Number(e.target.value))}
                  >
                    {drawing.palette.map((p, i) => (
                      <option key={p.id} value={i}>
                        {p.name || `Color ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Color que se conserva
                  <select
                    value={mergeTo}
                    onChange={(e) => setMergeTo(Number(e.target.value))}
                  >
                    {drawing.palette.map((p, i) => (
                      <option key={p.id} value={i}>
                        {p.name || `Color ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                disabled={Boolean(busy) || mergeFrom === mergeTo}
                onClick={() => {
                  const next = mergeDrawingColors(drawing, mergeFrom, mergeTo);
                  setDrawing(next);
                  setMergeFrom(0);
                  setMergeTo(Math.min(1, next.palette.length - 1));
                }}
              >
                Fusionar colores
              </button>
            </fieldset>
          )}
          <div className="import-actions">
            <button disabled={Boolean(busy)} onClick={() => setStep(2)}>
              ← Cuadros
            </button>
            <button
              className="primary"
              disabled={Boolean(busy)}
              onClick={() => {
                setMappings({});
                setStep(4);
              }}
            >
              Ver resultado
            </button>
          </div>
        </>
      )}
      {step === 4 && drawing && (
        <>
          <ImagePreview
            drawing={drawing}
            stitchRatio={rowHeightCm / stitchWidthCm}
          />
          <p>
            {drawing.cols} puntos × {drawing.rows} filas ·{' '}
            {format.format(drawing.cols * stitchWidthCm)} ×{' '}
            {format.format(drawing.rows * rowHeightCm)} cm.
          </p>
          {profileSelect}
          {profile.approximate && (
            <p className="notice">
              Esta muestra es aproximada. Una muestra propia ajustará las
              medidas a tu hilo.
            </p>
          )}
          <p className="subtle">
            {photo
              ? 'La proporción se ha adaptado a la muestra del paso Cuadros.'
              : 'Cada cuadro sigue siendo un punto. Así se verá con la proporción real de tu muestra.'}
          </p>
          {photo && !project && (
            <p>
              Cambiar la muestra requiere volver a Cuadros para recalcular las
              filas.
            </p>
          )}
          <div className="import-actions">
            <button onClick={() => setStep(3)}>← Colores</button>
            <button className="primary" onClick={() => setStep(5)}>
              Elegir la pieza
            </button>
          </div>
        </>
      )}
      {step === 5 && drawing && (
        <>
          {!project && (
            <>
              <label>
                Nombre del proyecto
                <input
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Cómo vas a tejer
                <select
                  value={construction}
                  onChange={(e) =>
                    setConstruction(
                      e.target.value === 'round' ? 'round' : 'flat',
                    )
                  }
                >
                  <option value="flat">En plano</option>
                  <option value="round">En redondo (espiral continua)</option>
                </select>
              </label>
              <label>
                Medir la pieza en
                <select
                  value={unit}
                  onChange={(e) => {
                    setUnit(e.target.value === 'cm' ? 'cm' : 'stitches');
                    setWidth('40');
                    setHeight('40');
                    setGrow(false);
                  }}
                >
                  <option value="cm">Centímetros</option>
                  <option value="stitches">Puntos y filas</option>
                </select>
              </label>
              <div className="import-fields">
                <label>
                  Ancho de la pieza ({unit === 'cm' ? 'cm' : 'puntos'})
                  <input
                    type="number"
                    min={unit === 'cm' ? 0.1 : 1}
                    step={unit === 'cm' ? 'any' : 1}
                    value={width}
                    onChange={(e) => {
                      setWidth(e.target.value);
                      setGrow(false);
                    }}
                  />
                </label>
                <label>
                  Alto de la pieza ({unit === 'cm' ? 'cm' : 'filas'})
                  <input
                    type="number"
                    min={unit === 'cm' ? 0.1 : 1}
                    step={unit === 'cm' ? 'any' : 1}
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value);
                      setGrow(false);
                    }}
                  />
                </label>
              </div>
            </>
          )}
          <label>
            Escala del dibujo
            <select
              value={scale}
              onChange={(e) => {
                setScale(e.target.value);
                setGrow(false);
              }}
            >
              <option value="1">×1 · un cuadro, un punto</option>
              <option value="2">×2 · bloques de 2 × 2</option>
              <option value="3">×3 · bloques de 3 × 3</option>
              <option value="fit">Ajustar al ancho de la pieza</option>
            </select>
          </label>
          {scale === 'fit' && (
            <>
              <label>
                Margen mínimo de fondo (puntos)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </label>
              <p className="subtle">
                Se ajusta también el lado más largo para que quepa con ese
                margen.
              </p>
            </>
          )}
          {fractional && (
            <p className="notice">
              Esta escala no es entera: el dibujo puede perder detalle. Revisa
              la vista previa antes de colocarlo.
            </p>
          )}
          {placementError && (
            <p className="error" role="alert">
              {placementError}
            </p>
          )}
          {scaled && (
            <>
              <ImagePreview
                drawing={scaledPreview}
                stitchRatio={rowHeightCm / stitchWidthCm}
              />
              <p>
                Dibujo: {bounds?.width ?? 0} puntos × {bounds?.height ?? 0}{' '}
                filas · {format.format((bounds?.width ?? 0) * stitchWidthCm)} ×{' '}
                {format.format((bounds?.height ?? 0) * rowHeightCm)} cm.
              </p>
            </>
          )}
          {placement && (
            <>
              <p>
                Pieza: {grow ? placement.minimumCols : base?.cols} puntos ×{' '}
                {grow ? placement.minimumRows : base?.rows} filas ·{' '}
                {format.format(
                  (grow ? placement.minimumCols : (base?.cols ?? 0)) *
                    stitchWidthCm,
                )}{' '}
                ×{' '}
                {format.format(
                  (grow ? placement.minimumRows : (base?.rows ?? 0)) *
                    rowHeightCm,
                )}{' '}
                cm.
              </p>
              {report && (
                <p className="notice">
                  Fondo: {report.left} puntos a la izquierda, {report.right} a
                  la derecha; {report.bottom} filas abajo, {report.top} arriba.{' '}
                  {placement.centering.warning ??
                    'El diseño está exactamente centrado.'}
                </p>
              )}
              {placement.problem === 'size' && (
                <div role="alert" className="notice">
                  <p>
                    El dibujo no cabe. Puedes agrandar la pieza a{' '}
                    {placement.minimumCols} × {placement.minimumRows} puntos (
                    {format.format(placement.minimumCols * stitchWidthCm)} ×{' '}
                    {format.format(placement.minimumRows * rowHeightCm)} cm) o
                    reducir el dibujo.
                  </p>
                  <div className="import-actions">
                    <button onClick={() => setGrow(true)}>
                      Agrandar la pieza
                    </button>
                    <button
                      onClick={() => {
                        setScale('fit');
                        setMargin('0');
                        setGrow(false);
                      }}
                    >
                      Reducir para que quepa
                    </button>
                  </div>
                </div>
              )}
              {grow && (
                <p role="status">
                  Se agrandará la pieza al mínimo necesario para conservar el
                  dibujo entero.
                </p>
              )}
              {project &&
                (placement.problem === 'palette' ||
                  Object.values(mappings).some(Boolean)) && (
                  <div className="notice">
                    <p
                      role={
                        placement.problem === 'palette' ? 'alert' : 'status'
                      }
                    >
                      Paleta combinada: {placement.paletteSize} colores; el
                      máximo es 12.
                      {placement.problem === 'palette'
                        ? ' Fusiona colores importados con los del proyecto para continuar.'
                        : ' Revisa las fusiones antes de colocar el dibujo.'}
                    </p>
                    {drawing.palette.map((entry, i) =>
                      i === drawing.background ? null : (
                        <label key={entry.id}>
                          {entry.name}
                          <select
                            value={mappings[i] ?? ''}
                            onChange={(e) =>
                              setMappings({ ...mappings, [i]: e.target.value })
                            }
                          >
                            <option value="">Añadir como color nuevo</option>
                            {project.palette.map((p) => (
                              <option key={p.id} value={p.id}>
                                Fusionar con {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ),
                    )}
                  </div>
                )}
              {project && (
                <p className="subtle">
                  El fondo de la imagen deja visible lo que ya dibujaste. Los
                  demás colores se colocan encima. Puedes deshacer toda la
                  importación de una vez.
                </p>
              )}
            </>
          )}
          <div className="import-actions">
            <button onClick={() => setStep(4)}>← Resultado</button>
            <button
              className="primary"
              disabled={!placement?.project || !name.trim()}
              onClick={() => {
                if (!placement?.project) return;
                const next = {
                  ...placement.project,
                  palette: placement.project.palette.map((p) => ({
                    ...p,
                    name: p.name.trim() || 'Color',
                  })),
                };
                onComplete(
                  project
                    ? next
                    : {
                        ...next,
                        id: createId(),
                        name: name.trim(),
                        palette: next.palette.map((p) => ({
                          ...p,
                          name: p.name.trim() || 'Color',
                        })),
                      },
                );
              }}
            >
              {project
                ? 'Importar en el proyecto'
                : 'Crear proyecto con imagen'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
