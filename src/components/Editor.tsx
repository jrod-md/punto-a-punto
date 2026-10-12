import { createId } from '../storage/ids';
import { useState } from 'react';
import { commitHistory, createHistory, deleteColor, floodFill, moveSelection, paintStroke, redoHistory, resizeProject, undoHistory } from '../core/editor';
import { gauge } from '../core/gauge';
import { centerDesign } from '../core/grid';
import type { Bounds } from '../core/grid';
import { validateEditorSize } from '../core/projectFile';
import { changeProjectProfile } from '../core/profiles';
import type { GaugeProfile, Project } from '../core/types';
import type { Tool } from '../editor/canvasEngine';
import GridCanvas from './GridCanvas';
import ConfirmDialog from './ConfirmDialog';
import EditorPanel from './EditorPanel';
import ToolIcon from './ToolIcon';
import YarnPanel from './YarnPanel';

interface Props {
  initialProject: Project;
  profiles: GaugeProfile[];
  saveStatus: string;
  onChange(project: Project): void;
  onBack(): void;
  onExport(project: Project): void;
  onCalibrate(project: Project): void;
  onNavigate(project: Project, screen: 'pattern' | 'weave'): void;
}
const tools: { id: Tool; name: string }[] = [{ id: 'paint', name: 'Pintar' }, { id: 'erase', name: 'Borrar' }, { id: 'fill', name: 'Rellenar' }, { id: 'select', name: 'Seleccionar' }];

export default function Editor({ initialProject, profiles, saveStatus, onChange, onBack, onExport, onCalibrate, onNavigate }: Props) {
  const [history, setHistory] = useState(() => createHistory(initialProject));
  const [tool, setTool] = useState<Tool>('paint');
  const [selectedId, setSelectedId] = useState(initialProject.palette[1]?.id ?? initialProject.backgroundColorId);
  const [centers, setCenters] = useState(true);
  const [selection, setSelection] = useState<Bounds | null>(null);
  const [report, setReport] = useState('');
  const [panel, setPanel] = useState<'settings' | 'yarn' | null>(null);
  const project = history.present;
  const profile = profiles.find((entry) => entry.id === project.profileId)!;
  const colorIndex = Math.max(0, project.palette.findIndex((color) => color.id === selectedId));
  const measures = gauge(profile);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
  const saveFailed = saveStatus.startsWith('No ') || saveStatus.startsWith('El último');

  function apply(next: Project) {
    if (next === project) return;
    setHistory(commitHistory(history, next)); onChange(next);
  }
  function travel(direction: 'undo' | 'redo') {
    const next = direction === 'undo' ? undoHistory(history) : redoHistory(history);
    setHistory(next); setSelection(null); setReport(''); onChange(next.present);
  }
  function center() {
    const result = centerDesign(project, project.palette.findIndex((color) => color.id === project.backgroundColorId));
    if (result.moved) apply({ ...project, ...result.grid });
    setSelection(null);
    setReport(result.margins ? `Fondo: ${result.margins.left} puntos a la izquierda, ${result.margins.right} a la derecha; ${result.margins.bottom} filas abajo, ${result.margins.top} arriba. ${result.warning ?? 'El diseño está exactamente centrado.'}` : result.warning ?? 'Todavía no hay un diseño para centrar.');
  }

  return <main className="editor-page">
    <header className="editor-heading"><button className="quiet" aria-label="Volver a proyectos" onClick={onBack}>←</button><div className="editor-title"><h1>{project.name}</h1><p>{project.cols} × {project.rows} · {format.format(project.cols * measures.stitchWidthCm)} × {format.format(project.rows * measures.rowHeightCm)} cm</p></div><button onClick={() => setPanel('yarn')}>Hilo</button><button onClick={() => setPanel('settings')}>Ajustes</button></header>
    <section className="drawing-panel" aria-label="Herramientas y cuadrícula">
      <GridCanvas project={project} profile={profile} tool={tool} colorIndex={colorIndex} centers={centers} selection={selection} onStroke={(indices, color) => { apply(paintStroke(project, indices, color)); setReport(''); }} onFill={(point) => { apply(floodFill(project, point, colorIndex)); setReport(''); }} onSelect={setSelection} onMove={(bounds, dx, dy) => {
        const result = moveSelection(project, bounds, dx, dy); apply(result.project); setReport(result.warning ?? 'Selección movida.');
        if (!result.warning) setSelection({ ...bounds, left: bounds.left + dx, bottom: bounds.bottom + dy });
      }} />
      <p className={saveFailed ? 'editor-save save-error' : 'editor-save save-status'} role={saveFailed ? 'alert' : 'status'}>{saveStatus}</p>
      {!saveFailed && (report || tool === 'select') && <div className="editor-message"><p role="status">{report || 'Arrastra un rectángulo; luego arrastra dentro para moverlo.'}</p><button aria-label={report ? 'Cerrar aviso' : 'Quitar selección'} onClick={() => { setReport(''); setSelection(null); if (tool === 'select') setTool('paint'); }}>×</button></div>}
    </section>
    <footer className="editor-dock">
      <div className="swatches" role="group" aria-label="Colores para pintar">{project.palette.map((color, index) => <button key={color.id} aria-pressed={index === colorIndex} aria-label={`Pintar con ${color.name}`} onClick={() => setSelectedId(color.id)}><span className="color-dot" style={{ backgroundColor: color.hex }} /><span className="sr-only">{color.name}</span></button>)}</div>
      <div className="tool-bar" role="group" aria-label="Herramientas">{tools.map((entry) => <button key={entry.id} aria-label={entry.name} aria-pressed={tool === entry.id} onClick={() => { setTool(entry.id); setReport(''); }}><ToolIcon name={entry.id} /><span className="tool-caption">{entry.id === 'select' ? 'Elegir' : entry.name}</span></button>)}<button aria-label="Deshacer" disabled={!history.past.length} onClick={() => travel('undo')}><ToolIcon name="undo" /><span className="tool-caption">Deshacer</span></button><button aria-label="Rehacer" disabled={!history.future.length} onClick={() => travel('redo')}><ToolIcon name="redo" /><span className="tool-caption">Rehacer</span></button><button aria-label="Centrar diseño" onClick={center}><ToolIcon name="center" /><span className="tool-caption">Centrar</span></button></div>
    </footer>
    {panel && <EditorPanel title={panel === 'settings' ? 'Ajustes del proyecto' : 'Hilo que necesitas'} onClose={() => setPanel(null)}>
      {saveFailed && <p role="alert" className="error">{saveStatus}</p>}
      {panel === 'settings' && <div className="page-actions"><button onClick={() => onNavigate(project, 'pattern')}>Ver patrón</button><button className="primary" onClick={() => onNavigate(project, 'weave')}>Modo tejer</button></div>}
      {panel === 'yarn' ? <YarnPanel project={project} profile={profile} onChange={apply} onCalibrate={() => onCalibrate(project)} /> : <>
        <label>Nombre del proyecto<input key={project.name} defaultValue={project.name} maxLength={120} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== project.name) apply({ ...project, name }); else event.target.value = project.name; }} /></label>
        <label>Muestra del proyecto<select value={project.profileId} onChange={(event) => { const next = profiles.find((entry) => entry.id === event.target.value); if (next) { apply(changeProjectProfile(project, next)); setReport('Muestra cambiada: el dibujo conserva sus puntos y filas. El tamaño en centímetros y el hilo se han recalculado.'); } }}>{profiles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.approximate ? ' · Aproximado' : ''}</option>)}</select></label><p className="subtle">Cambiar la muestra recalcula el tamaño real y el hilo; conserva todo el dibujo.</p>
        {profile.approximate && <div className="notice"><p>Esta muestra es aproximada.</p><button onClick={() => onCalibrate(project)}>Calibrar mi muestra</button></div>}
        <details><summary>Medidas</summary><ResizeForm key={`${project.cols}:${project.rows}`} project={project} onChange={(next) => { apply(next); setSelection(null); setReport(''); }} /></details>
        <details><summary>Editar colores ({project.palette.length}/12)</summary><button disabled={project.palette.length >= 12} onClick={() => { const color = { id: createId(), name: `Color ${project.palette.length + 1}`, hex: '#be6743' }; apply({ ...project, palette: [...project.palette, color] }); setSelectedId(color.id); }}>Añadir color</button>{project.palette.map((color) => <div className="palette-edit" key={`${color.id}:${color.name}:${color.hex}`}><label>Nombre del color<input aria-label={`Nombre de ${color.name}`} defaultValue={color.name} maxLength={60} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== color.name) apply({ ...project, palette: project.palette.map((entry) => entry.id === color.id ? { ...entry, name } : entry) }); else event.target.value = color.name; }} /></label><label>Tono<input type="color" aria-label={`Tono de ${color.name}`} value={color.hex} onInput={(event) => { const hex = event.currentTarget.value; apply({ ...project, palette: project.palette.map((entry) => entry.id === color.id ? { ...entry, hex } : entry) }); }} /></label>{color.id === project.backgroundColorId ? <p className="subtle">Fondo, no se puede borrar</p> : <button className="danger" onClick={() => { apply(deleteColor(project, color.id)); setSelection(null); }}>Borrar {color.name}</button>}</div>)}</details>
        <button aria-pressed={centers} onClick={() => setCenters(!centers)}>{centers ? 'Ocultar centro' : 'Mostrar centro'}</button>
        <p className="subtle">Un dedo usa la herramienta. Dos dedos desplazan y amplían. En PC: rueda para ampliar; botón central o espacio y arrastre para desplazar.</p><p className="tool-legend">Herramientas, de izquierda a derecha: pintar, borrar, rellenar, seleccionar, deshacer, rehacer y centrar.</p>
        <button onClick={() => onExport(project)}>Exportar respaldo JSON</button>
      </>}
    </EditorPanel>}
  </main>;
}
function ResizeForm({ project, onChange }: { project: Project; onChange(project: Project): void }) {
  const [cols, setCols] = useState(String(project.cols));
  const [rows, setRows] = useState(String(project.rows));
  const [error, setError] = useState('');
  const [pendingCrop, setPendingCrop] = useState(false);
  return <form onSubmit={(event) => {
    event.preventDefault();
    try {
      validateEditorSize(Number(cols), Number(rows));
      const result = resizeProject(project, Number(cols), Number(rows));
      if (result.needsCrop) {
        setPendingCrop(true); return;
      }
      onChange(result.project); setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Revisa las medidas.'); }
  }}><div className="field-pair"><label>Puntos<input type="number" min={1} max={1000} value={cols} onChange={(event) => setCols(event.target.value)} required /></label><label>Filas<input type="number" min={1} max={1000} value={rows} onChange={(event) => setRows(event.target.value)} required /></label></div><p className="subtle">Si hace falta, el diseño se desplaza para caber sin perder puntos. Máximo: 1000 puntos y 1000 filas.</p>{error && <p role="alert" className="error">{error}</p>}<button type="submit">Cambiar medidas</button>{pendingCrop && <ConfirmDialog title="El diseño no cabe" message="Este tamaño recorta parte del diseño. Si continúas, perderás las celdas que queden fuera. Puedes deshacer el cambio." confirmLabel="Cambiar y recortar" onCancel={() => setPendingCrop(false)} onConfirm={() => { onChange(resizeProject(project, Number(cols), Number(rows), true).project); setPendingCrop(false); }} />}</form>;
}
