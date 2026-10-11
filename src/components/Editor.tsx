import { useState } from 'react';
import { commitHistory, createHistory, deleteColor, floodFill, moveSelection, paintStroke, redoHistory, resizeProject, undoHistory } from '../core/editor';
import { gauge } from '../core/gauge';
import { centerDesign } from '../core/grid';
import type { Bounds } from '../core/grid';
import { validateEditorSize } from '../core/projectFile';
import type { GaugeProfile, Project } from '../core/types';
import type { Tool } from '../editor/canvasEngine';
import GridCanvas from './GridCanvas';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  initialProject: Project;
  profile: GaugeProfile;
  saveStatus: string;
  onChange(project: Project): void;
  onBack(): void;
  onExport(project: Project): void;
}

const tools: { id: Tool; name: string }[] = [{ id: 'paint', name: 'Pintar' }, { id: 'erase', name: 'Borrar' }, { id: 'fill', name: 'Rellenar' }, { id: 'select', name: 'Seleccionar' }];

export default function Editor({ initialProject, profile, saveStatus, onChange, onBack, onExport }: Props) {
  const [history, setHistory] = useState(() => createHistory(initialProject));
  const [tool, setTool] = useState<Tool>('paint');
  const [selectedId, setSelectedId] = useState(initialProject.palette[1]?.id ?? initialProject.backgroundColorId);
  const [centers, setCenters] = useState(true);
  const [selection, setSelection] = useState<Bounds | null>(null);
  const [report, setReport] = useState('');
  const project = history.present;
  const colorIndex = Math.max(0, project.palette.findIndex((color) => color.id === selectedId));
  const measures = gauge(profile);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
  const saveFailed = saveStatus.startsWith('No ') || saveStatus.startsWith('El último');

  function apply(next: Project) {
    if (next === project) return;
    setHistory(commitHistory(history, next)); onChange(next);
  }

  return <main className="editor-page">
    <header className="editor-heading"><button className="quiet" onClick={onBack}>← Proyectos</button><div><h1>{project.name}</h1><p>{project.cols} puntos × {project.rows} filas · {format.format(project.cols * measures.stitchWidthCm)} × {format.format(project.rows * measures.rowHeightCm)} cm</p></div><p className={saveFailed ? 'save-error' : 'save-status'} role={saveFailed ? 'alert' : 'status'}>{saveStatus}</p></header>
    <div className="editor-layout">
      <section className="drawing-panel" aria-label="Herramientas y cuadrícula">
        <div className="tool-bar" aria-label="Herramientas">{tools.map((entry) => <button key={entry.id} aria-pressed={tool === entry.id} onClick={() => { setTool(entry.id); setReport(''); }}>{entry.name}</button>)}</div>
        <div className="history-bar"><button disabled={!history.past.length} onClick={() => { const next = undoHistory(history); setHistory(next); setSelection(null); setReport(''); onChange(next.present); }}>Deshacer</button><button disabled={!history.future.length} onClick={() => { const next = redoHistory(history); setHistory(next); setSelection(null); setReport(''); onChange(next.present); }}>Rehacer</button><button onClick={() => {
          const background = project.palette.findIndex((color) => color.id === project.backgroundColorId);
          const result = centerDesign(project, background);
          if (result.moved) apply({ ...project, ...result.grid });
          setSelection(null);
          setReport(result.margins ? `Fondo: ${result.margins.left} puntos a la izquierda, ${result.margins.right} a la derecha; ${result.margins.bottom} filas abajo, ${result.margins.top} arriba. ${result.warning ?? 'El diseño está exactamente centrado.'}` : result.warning ?? 'Todavía no hay un diseño para centrar.');
        }}>Centrar diseño</button><button aria-pressed={centers} onClick={() => setCenters(!centers)}>{centers ? 'Ocultar centro' : 'Mostrar centro'}</button></div>
        {report && <p className="notice" role="status">{report}</p>}
        {tool === 'select' && <p className="selection-help">Arrastra para seleccionar un rectángulo. Después arrastra dentro de él para moverlo. <button className="quiet" onClick={() => setSelection(null)}>Quitar selección</button></p>}
        <GridCanvas project={project} profile={profile} tool={tool} colorIndex={colorIndex} centers={centers} selection={selection} onStroke={(indices, color) => { apply(paintStroke(project, indices, color)); setReport(''); }} onFill={(point) => { apply(floodFill(project, point, colorIndex)); setReport(''); }} onSelect={setSelection} onMove={(bounds, dx, dy) => {
          const result = moveSelection(project, bounds, dx, dy);
          apply(result.project); setReport(result.warning ?? 'Selección movida.');
          if (!result.warning) setSelection({ ...bounds, left: bounds.left + dx, bottom: bounds.bottom + dy });
        }} />
      </section>
      <aside className="editor-sidebar">
        <section className="palette-panel" aria-labelledby="palette-title"><div className="section-heading"><h2 id="palette-title">Tus colores</h2><span>{project.palette.length}/12</span></div><p className="subtle">Elige un color para pintar.</p><div className="swatches">{project.palette.map((color, index) => <button key={color.id} aria-pressed={index === colorIndex} aria-label={`Pintar con ${color.name}`} onClick={() => setSelectedId(color.id)}><span className="color-dot" style={{ backgroundColor: color.hex }} /><span>{color.name}</span></button>)}</div>
          <button disabled={project.palette.length >= 12} onClick={() => { const color = { id: crypto.randomUUID(), name: `Color ${project.palette.length + 1}`, hex: '#be6743' }; apply({ ...project, palette: [...project.palette, color] }); setSelectedId(color.id); }}>Añadir color</button>
          <details><summary>Editar colores</summary>{project.palette.map((color) => <div className="palette-edit" key={`${color.id}:${color.name}:${color.hex}`}><label>Nombre del color<input aria-label={`Nombre de ${color.name}`} defaultValue={color.name} maxLength={60} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== color.name) apply({ ...project, palette: project.palette.map((entry) => entry.id === color.id ? { ...entry, name } : entry) }); else event.target.value = color.name; }} /></label><label>Tono<input type="color" aria-label={`Tono de ${color.name}`} value={color.hex} onInput={(event) => { const hex = event.currentTarget.value; apply({ ...project, palette: project.palette.map((entry) => entry.id === color.id ? { ...entry, hex } : entry) }); }} /></label>{color.id === project.backgroundColorId ? <p className="subtle">Fondo, no se puede borrar</p> : <button className="danger" onClick={() => { apply(deleteColor(project, color.id)); setSelection(null); }}>Borrar {color.name}</button>}</div>)}</details>
        </section>
        <details className="project-settings"><summary>Medidas y nombre</summary><label>Nombre del proyecto<input key={project.name} defaultValue={project.name} maxLength={120} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== project.name) apply({ ...project, name }); else event.target.value = project.name; }} /></label><ResizeForm key={`${project.cols}:${project.rows}`} project={project} onChange={(next) => { apply(next); setSelection(null); setReport(''); }} /><p className="subtle">Muestra: {profile.name}</p>{profile.approximate && <p className="notice">Las medidas son aproximadas porque este perfil es de fábrica.</p>}</details>
        <button className="quiet" onClick={() => onExport(project)}>Exportar respaldo JSON</button>
      </aside>
    </div>
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
