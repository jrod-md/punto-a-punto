import { useEffect, useMemo, useRef, useState } from 'react';
import { gauge } from '../core/gauge';
import { designBounds } from '../core/grid';
import { previewDrawingOnBackground } from '../core/imageBackground';
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
  initialFile?: File;
  onCancel(): void;
  onComplete(project: Project): void;
}

type Phase = 'pick' | 'read' | 'place';
type Panel = 'crop' | 'grid' | 'colors' | null;
type Stage = 'drawing' | 'source';

const ACCEPTED = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';
const MAX_FILE_BYTES = 64 * 1024 * 1024;

function nameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const words = base.trim();
  // Camera and chat exports carry meaningless names such as IMG_2041.
  if (
    !/[a-záéíóúñ]{3}/i.test(words) ||
    /^(img|image|screenshot)\b/i.test(words)
  )
    return 'Mi diseño';
  return (words.charAt(0).toUpperCase() + words.slice(1)).slice(0, 60);
}

export default function ImageImport({
  profiles,
  project,
  initialFile,
  onCancel,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [panel, setPanel] = useState<Panel>(null);
  const [stage, setStage] = useState<Stage>('drawing');
  const [image, setImage] = useState<PixelImage>();
  const [cropped, setCropped] = useState<PixelImage>();
  const [crop, setCrop] = useState<Crop>();
  const [mesh, setMesh] = useState<ImageMesh>();
  const [inspection, setInspection] = useState<GridInspection>();
  const [reading, setReading] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [cols, setCols] = useState('');
  const [rows, setRows] = useState('');
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
  const opened = useRef(false);
  const drag = useRef<{ corner: 'start' | 'end'; crop: Crop } | null>(null);
  const confirmedCounts = useRef<{ cols?: number; rows?: number }>({});
  const cropRef = useRef<HTMLDivElement>(null);
  const profile = profiles.find((p) => p.id === profileId)!;
  const { stitchWidthCm, rowHeightCm } = gauge(profile);
  const stitchRatio = rowHeightCm / stitchWidthCm;
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });

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

  // Crop, grid and colours are all read in one go so the first thing the
  // user sees is her drawing, not a form.
  async function analyze(source: PixelImage, area: Crop) {
    const result = await run({ kind: 'detect', image: source, crop: area });
    if (!result?.image) return;
    const isPhoto = result.inspection?.kind === 'photo';
    const found = Boolean(result.mesh) || isPhoto;
    confirmedCounts.current = {};
    setCropped(result.image);
    setMesh(result.mesh ?? undefined);
    setInspection(result.inspection);
    setPhoto(isPhoto);
    setCols(result.mesh ? String(result.mesh.cols) : isPhoto ? '60' : '');
    setRows(result.mesh ? String(result.mesh.rows) : '');
    setDrawing(undefined);
    setSamples([]);
    setMappings({});
    setPanel(found ? null : 'grid');
    setStage(found ? 'drawing' : 'source');
    setPhase('read');
  }

  async function openFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setError('El archivo supera 64 MB. Guarda una copia más pequeña.');
      return;
    }
    const decoded = await run({ kind: 'decode', file });
    if (!decoded?.image) return;
    const area = decoded.crop ?? {
      x: 0,
      y: 0,
      width: decoded.image.width,
      height: decoded.image.height,
    };
    if (!project) setName(nameFromFile(file));
    setImage(decoded.image);
    setCrop(area);
    await analyze(decoded.image, area);
  }

  useEffect(() => {
    mounted.current = true;
    jobs.current = new ImageJobs();
    if (initialFile && !opened.current) {
      opened.current = true;
      void openFile(initialFile);
    }
    return () => {
      mounted.current = false;
      jobs.current?.dispose();
      jobs.current = null;
    };
    // The worker and the first file are set up once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meshState = useMemo(() => {
    try {
      if (!cropped || phase === 'pick') return { mesh, error: '' };
      if (!cols || (!photo && !rows))
        throw new Error('Escribe cuántos cuadros tiene de ancho y de alto.');
      const value = photo
        ? photoMesh(cropped, Number(cols), stitchWidthCm, rowHeightCm)
        : mesh?.cols === Number(cols) && mesh.rows === Number(rows)
          ? mesh
          : manualMesh(cropped, Number(cols), Number(rows));
      return { mesh: value, error: '' };
    } catch (reason) {
      return {
        mesh: undefined,
        error: reason instanceof Error ? reason.message : 'Revisa los cuadros.',
      };
    }
  }, [cropped, phase, cols, rows, photo, mesh, stitchWidthCm, rowHeightCm]);
  const currentMesh = meshState.mesh;
  const meshError = meshState.error;

  // Any change to the crop or the grid re-reads the drawing by itself.
  useEffect(() => {
    if (phase !== 'read' || !cropped || !currentMesh) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setReading(true);
      void jobs
        .current!.run(
          { kind: 'sample', image: cropped, mesh: currentMesh, maximum: 12 },
          () => {},
        )
        .then((result) => {
          if (cancelled || !result.drawing || !result.samples) return;
          setDrawing(result.drawing);
          setSamples(result.samples);
          setMaximum(Math.max(2, result.drawing.palette.length));
          setMergeFrom(0);
          setMergeTo(Math.min(1, result.drawing.palette.length - 1));
          if (result.drawing.background === null) setPanel('colors');
        })
        .catch(() => {
          if (!cancelled)
            setError(
              'No se pudo leer el dibujo. Revisa el recorte y los cuadros.',
            );
        })
        .finally(() => {
          if (!cancelled) setReading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phase, cropped, currentMesh]);

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

  function chooseBackground(background: number) {
    if (!drawing) return;
    setDrawing({
      ...drawing,
      background,
      cells: drawing.cells.map((value, i) =>
        drawing.transparent?.[i] ? background : value,
      ),
    });
  }

  function togglePanel(next: Exclude<Panel, null>) {
    const opening = panel !== next;
    setPanel(opening ? next : null);
    if (opening && next === 'grid') setStage('source');
    if (opening && next === 'colors') setStage('drawing');
  }

  const readPreview = useMemo(
    () =>
      drawing && drawing.background !== null
        ? previewDrawingOnBackground(drawing)
        : drawing,
    [drawing],
  );

  let placement: ReturnType<typeof planImagePlacement> | undefined;
  let scaled: ImportedDrawing | undefined;
  let placementError = '';
  let fractional = false;
  let base: Project | undefined;
  if (drawing && phase === 'place') {
    try {
      if (drawing.background === null)
        throw new Error('Elige un color de fondo antes de continuar.');
      const size = project
        ? { cols: project.cols, rows: project.rows }
        : unit === 'cm'
          ? sizing(profile, Number(width), Number(height))
          : { cols: Number(width), rows: Number(height) };
      if (
        !project &&
        (!width || !height || Number(width) <= 0 || Number(height) <= 0)
      )
        throw new Error('Escribe el ancho y el alto de la pieza.');
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
  const bounds =
    scaled && scaled.background !== null
      ? designBounds(placement?.centering.grid ?? scaled, scaled.background)
      : null;
  const report = placement?.centering.margins;
  const pieceCols = grow ? placement?.minimumCols : base?.cols;
  const pieceRows = grow ? placement?.minimumRows : base?.rows;
  // The finished piece is the preview: what she sees is what gets created.
  const placePreview: ImportedDrawing | undefined = placement?.project
    ? {
        cols: placement.project.cols,
        rows: placement.project.rows,
        cells: placement.project.cells,
        palette: [...placement.project.palette],
        background: Math.max(
          0,
          placement.project.palette.findIndex(
            (color) => color.id === placement.project!.backgroundColorId,
          ),
        ),
      }
    : scaled;

  function finish() {
    if (!placement?.project) return;
    const palette = placement.project.palette.map((color) => ({
      ...color,
      name: color.name.trim() || 'Color',
    }));
    onComplete(
      project
        ? { ...placement.project, palette }
        : {
            ...placement.project,
            palette,
            id: createId(),
            name: name.trim() || 'Mi diseño',
          },
    );
  }

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

  const filePicker = (label: string, className: string) => (
    <label className={`file-button ${className}`}>
      {label}
      <input
        type="file"
        accept={ACCEPTED}
        disabled={Boolean(busy)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void openFile(file);
        }}
      />
    </label>
  );

  const status = (
    <>
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
    </>
  );

  if (phase === 'pick')
    return (
      <section className="image-import" aria-label="Importar imagen">
        <header className="flow-bar">
          <button
            className="quiet"
            aria-label="Volver"
            disabled={Boolean(busy)}
            onClick={onCancel}
          >
            ←
          </button>
          <h1>{project ? 'Añadir una imagen' : 'Empezar con una imagen'}</h1>
        </header>
        {status}
        {!busy && (
          <>
            <p>
              Abre un pixel art o la captura de un patrón. La app lee los
              cuadros y los colores por ti. La imagen no sale de este
              dispositivo.
            </p>
            {filePicker('Elegir imagen', 'primary')}
          </>
        )}
      </section>
    );

  if (phase === 'read' && cropped) {
    const cropping = panel === 'crop' && image && crop;
    const smallCells =
      !photo &&
      (inspection?.small ||
        (currentMesh &&
          Math.min(
            cropped.width / currentMesh.cols,
            cropped.height / currentMesh.rows,
          ) < 6));
    const background =
      drawing && drawing.background !== null
        ? drawing.palette[drawing.background]
        : undefined;
    const ready = Boolean(drawing && background && currentMesh && !reading);
    return (
      <section className="image-import" aria-label="Importar imagen">
        <header className="flow-bar">
          <button
            className="quiet"
            aria-label="Cancelar y volver"
            onClick={onCancel}
          >
            ←
          </button>
          <h1>Tu dibujo</h1>
          <p className="flow-step">1 de 2</p>
        </header>
        {status}
        <div className={cropping ? 'stage cropping' : 'stage'}>
          {cropping ? (
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
          ) : stage === 'source' || !readPreview ? (
            <ImagePreview image={cropped} mesh={currentMesh} />
          ) : (
            <ImagePreview drawing={readPreview} stitchRatio={stitchRatio} />
          )}
        </div>
        {!cropping && (
          <div className="stage-footer">
            <p className="stage-caption" role="status">
              {reading
                ? 'Leyendo el dibujo…'
                : drawing && currentMesh
                  ? `${currentMesh.cols} × ${currentMesh.rows} cuadros · ${drawing.palette.length} colores${background ? ` · fondo ${background.name.toLowerCase()}` : ''}`
                  : 'Falta saber cuántos cuadros tiene'}
            </p>
            {readPreview && (
              <div className="segmented" role="group" aria-label="Qué ver">
                <button
                  aria-pressed={stage === 'drawing'}
                  onClick={() => setStage('drawing')}
                >
                  Dibujo
                </button>
                <button
                  aria-pressed={stage === 'source'}
                  onClick={() => setStage('source')}
                >
                  Original
                </button>
              </div>
            )}
          </div>
        )}
        {photo && (
          <p className="notice">
            Esta imagen no tiene cuadros, así que la convierto como una foto.
            Saldrá aproximada y habrá que retocarla en el editor.
          </p>
        )}
        {!photo && inspection?.kind === 'uncertain' && !drawing && (
          <p className="notice">
            No pude contar los cuadros con seguridad. Dime cuántos tiene de
            ancho y busco los de alto.
          </p>
        )}
        {smallCells && (
          <p className="notice">
            La imagen es pequeña y puede leerse con errores. Si tienes la imagen
            original, úsala en vez de una captura del chat.
          </p>
        )}
        {drawing && drawing.background === null && (
          <p className="notice">
            ¿Cuál de los colores es el fondo? Tócalo en la lista de colores.
          </p>
        )}

        <p className="adjust-label">¿Algo no se leyó bien?</p>
        <div className="adjust-tabs" role="group" aria-label="Corregir">
          {(
            [
              ['crop', 'Recorte'],
              ['grid', 'Cuadros'],
              ['colors', 'Colores'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-expanded={panel === id}
              aria-pressed={panel === id}
              disabled={id === 'colors' && !drawing}
              onClick={() => togglePanel(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {panel === 'crop' && image && crop && (
          <div className="adjust-panel">
            <p>Arrastra las dos esquinas hasta dejar solo el dibujo.</p>
            <div className="import-actions">
              <button
                disabled={Boolean(busy)}
                onClick={() => {
                  void run({ kind: 'rotate', image }).then((result) => {
                    if (result?.image) {
                      setImage(result.image);
                      setCrop(
                        result.crop ?? {
                          x: 0,
                          y: 0,
                          width: result.image.width,
                          height: result.image.height,
                        },
                      );
                    }
                  });
                }}
              >
                Girar
              </button>
              <button
                className="primary"
                disabled={Boolean(busy)}
                onClick={() => {
                  void analyze(image, crop);
                }}
              >
                Usar este recorte
              </button>
            </div>
            <details className="crop-fine">
              <summary>Ajuste fino</summary>
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
                        next.height = Math.min(
                          next.height,
                          image.height - next.y,
                        );
                        setCrop(next);
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
          </div>
        )}

        {panel === 'grid' && (
          <div className="adjust-panel">
            {photo ? (
              <>
                <label>
                  Ancho del resultado (puntos)
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={1000}
                    value={cols}
                    onChange={(e) => setCols(e.target.value)}
                  />
                </label>
                {!project && (
                  <label>
                    Muestra para tejer
                    <select
                      value={profileId}
                      onChange={(e) => setProfileId(e.target.value)}
                    >
                      {profiles.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
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
                    setDrawing(undefined);
                    setStage('source');
                  }}
                >
                  Sí tiene cuadros, los cuento yo
                </button>
              </>
            ) : (
              <>
                <p>
                  Las líneas naranjas deben caer entre los cuadros. Cambia un
                  número y la app busca el otro.
                </p>
                <div className="import-fields">
                  <label>
                    Cuadros de ancho
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={1000}
                      value={cols}
                      onChange={(e) => correctCount('cols', e.target.value)}
                    />
                  </label>
                  <label>
                    Cuadros de alto
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={1000}
                      value={rows}
                      onChange={(e) => correctCount('rows', e.target.value)}
                    />
                  </label>
                </div>
                <button
                  onClick={() => {
                    setPhoto(true);
                    setCols('60');
                  }}
                >
                  Es una foto, no tiene cuadros
                </button>
              </>
            )}
            {meshError && (cols !== '' || rows !== '' || photo) && (
              <p role="alert" className="error">
                {meshError}
              </p>
            )}
          </div>
        )}

        {panel === 'colors' && drawing && (
          <div className="adjust-panel">
            <ul className="import-colors">
              {drawing.palette.map((entry, i) => (
                <li key={entry.id}>
                  <span
                    className="color-dot"
                    style={{ backgroundColor: entry.hex }}
                  />
                  <input
                    aria-label={`Nombre del color ${i + 1}`}
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
                  <button
                    aria-pressed={drawing.background === i}
                    onClick={() => chooseBackground(i)}
                  >
                    Fondo
                  </button>
                </li>
              ))}
            </ul>
            <label>
              Cantidad de colores: {drawing.palette.length}
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
            {drawing.palette.length > 2 && (
              <details className="crop-fine">
                <summary>Unir dos colores parecidos</summary>
                <div className="import-fields">
                  <label>
                    Este color
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
                    pasa a ser
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
                    const next = mergeDrawingColors(
                      drawing,
                      mergeFrom,
                      mergeTo,
                    );
                    setDrawing(next);
                    setMergeFrom(0);
                    setMergeTo(Math.min(1, next.palette.length - 1));
                  }}
                >
                  Unir colores
                </button>
              </details>
            )}
          </div>
        )}

        <footer className="flow-actions">
          {filePicker('Otra imagen', 'quiet')}
          <button
            className="primary"
            disabled={!ready || Boolean(busy)}
            onClick={() => {
              setMappings({});
              setPanel(null);
              setPhase('place');
            }}
          >
            Continuar
          </button>
        </footer>
      </section>
    );
  }

  return (
    <section className="image-import" aria-label="Importar imagen">
      <header className="flow-bar">
        <button
          className="quiet"
          aria-label="Volver al dibujo"
          onClick={() => setPhase('read')}
        >
          ←
        </button>
        <h1>{project ? 'Colocar el dibujo' : 'Tamaño de la pieza'}</h1>
        <p className="flow-step">2 de 2</p>
      </header>
      <div className="stage">
        {placePreview && (
          <ImagePreview drawing={placePreview} stitchRatio={stitchRatio} />
        )}
      </div>
      {placement && bounds && (
        <p className="stage-summary" role="status">
          El dibujo medirá{' '}
          <strong>
            {format.format(bounds.width * stitchWidthCm)} ×{' '}
            {format.format(bounds.height * rowHeightCm)} cm
          </strong>{' '}
          ({bounds.width} puntos × {bounds.height} filas) en una pieza de{' '}
          <strong>
            {format.format((pieceCols ?? 0) * stitchWidthCm)} ×{' '}
            {format.format((pieceRows ?? 0) * rowHeightCm)} cm
          </strong>{' '}
          ({pieceCols} × {pieceRows}).
          {report &&
            ` Quedan ${report.left} puntos de fondo a la izquierda y ${report.right} a la derecha, ${report.bottom} filas abajo y ${report.top} arriba.`}
          {placement.centering.warning &&
            placement.problem !== 'size' &&
            ` ${placement.centering.warning}`}
        </p>
      )}
      {placementError && (
        <p className="error" role="alert">
          {placementError}
        </p>
      )}

      {!project && (
        <div className="import-fields">
          <label>
            Ancho ({unit === 'cm' ? 'cm' : 'puntos'})
            <input
              type="number"
              inputMode="decimal"
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
            Alto ({unit === 'cm' ? 'cm' : 'filas'})
            <input
              type="number"
              inputMode="decimal"
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
      )}

      <p className="adjust-label" id="scale-label">
        Tamaño del dibujo
      </p>
      <div
        className="segmented wide"
        role="group"
        aria-labelledby="scale-label"
      >
        {(
          [
            ['1', 'Normal'],
            ['2', 'Doble'],
            ['3', 'Triple'],
            ['fit', 'Llenar'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={scale === value}
            onClick={() => {
              setScale(value);
              setGrow(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {scale === 'fit' && (
        <label>
          Borde de fondo alrededor (puntos)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
          />
        </label>
      )}
      {fractional && (
        <p className="notice">
          Para llenar la pieza el dibujo se estira un poco y puede perder
          detalle. Míralo arriba antes de continuar.
        </p>
      )}
      {placement?.problem === 'size' && (
        <div role="alert" className="notice">
          <p>
            El dibujo no cabe en esa pieza. Puedes agrandarla a{' '}
            {format.format(placement.minimumCols * stitchWidthCm)} ×{' '}
            {format.format(placement.minimumRows * rowHeightCm)} cm o achicar el
            dibujo.
          </p>
          <div className="import-actions">
            <button onClick={() => setGrow(true)}>Agrandar la pieza</button>
            <button
              onClick={() => {
                setScale('fit');
                setMargin('0');
                setGrow(false);
              }}
            >
              Achicar el dibujo
            </button>
          </div>
        </div>
      )}
      {project &&
        placement &&
        (placement.problem === 'palette' ||
          Object.values(mappings).some(Boolean)) && (
          <div className="notice">
            <p role={placement.problem === 'palette' ? 'alert' : 'status'}>
              Con esta imagen serían {placement.paletteSize} colores y el máximo
              es 12.
              {placement.problem === 'palette' &&
                ' Une algunos con los que ya tienes.'}
            </p>
            {drawing?.palette.map((entry, i) =>
              i === drawing.background ? null : (
                <label key={entry.id}>
                  {entry.name}
                  <select
                    value={mappings[i] ?? ''}
                    onChange={(e) =>
                      setMappings({ ...mappings, [i]: e.target.value })
                    }
                  >
                    <option value="">Color nuevo</option>
                    {project.palette.map((p) => (
                      <option key={p.id} value={p.id}>
                        Usar {p.name}
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
          Se coloca encima de lo que ya dibujaste. Si no te gusta, un solo
          «Deshacer» lo quita.
        </p>
      )}

      {!project && (
        <details className="crop-fine">
          <summary>Más opciones</summary>
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
                setConstruction(e.target.value === 'round' ? 'round' : 'flat')
              }
            >
              <option value="flat">En plano</option>
              <option value="round">En redondo (espiral continua)</option>
            </select>
          </label>
          <label>
            Muestra para tejer
            <select
              value={profileId}
              disabled={photo}
              onChange={(e) => setProfileId(e.target.value)}
            >
              {profiles.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          {photo && (
            <p className="subtle">
              En una foto la muestra se elige en «Cuadros», en el paso anterior.
            </p>
          )}
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
        </details>
      )}
      {profile.approximate && !project && (
        <p className="subtle">
          Los centímetros salen de una muestra aproximada. Con tu propia muestra
          serán exactos.
        </p>
      )}

      <footer className="flow-actions">
        <button
          className="primary"
          disabled={!placement?.project}
          onClick={finish}
        >
          {project ? 'Añadir al proyecto' : 'Crear proyecto'}
        </button>
      </footer>
    </section>
  );
}
