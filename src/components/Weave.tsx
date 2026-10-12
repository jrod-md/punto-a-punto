import { useState } from 'react';
import { advanceProgress, commitProgress, currentRun, finishRow, nextRow, previousRow, progressHistory, undoProgress } from '../core/weaving';
import type { GaugeProfile, Progress, Project, TapStep } from '../core/types';
import GridCanvas from './GridCanvas';
import ConfirmDialog from './ConfirmDialog';
import useWakeLock from '../platform/useWakeLock';

interface Props { initialProject: Project; profile: GaugeProfile; saveStatus: string; onChange(project: Project): void; onBack(): void }
export default function Weave({ initialProject, profile, saveStatus, onChange, onBack }: Props) {
  const [history, setHistory] = useState(() => progressHistory(initialProject));
  const [step, setStep] = useState<TapStep>(initialProject.tapStep === 'color-run' || [1,5,10].includes(initialProject.tapStep) ? initialProject.tapStep : 5);
  const [confirmation, setConfirmation] = useState<'next' | 'reset' | null>(null);
  useWakeLock();
  const project = { ...initialProject, progress: history.present, tapStep: step };
  const label = project.construction === 'round' ? 'Vuelta' : 'Fila';
  const rtl = project.construction === 'round' || project.progress.row % 2 === 1;
  const done = project.progress.stitch - 1;
  const complete = done === project.cols;
  const finished = complete && project.progress.row === project.rows;
  const run = currentRun(project);
  const runText = run ? `Vas en: ${run.remaining} de ${project.palette.find((color) => color.id === run.colorId)!.name}.${run.next ? ` Sigue: ${run.next.count} de ${project.palette.find((color) => color.id === run.next!.colorId)!.name}.` : ' Después termina la ' + label.toLowerCase() + '.'}` : finished ? 'Pieza terminada. ¡Tu tejido está completo!' : label + ' terminada. Confirma para pasar a la siguiente.';
  const saveFailed = saveStatus.startsWith('No ') || saveStatus.startsWith('El último');
  function apply(progress: Progress) { const next = commitProgress(history, progress); setHistory(next); if (next !== history) onChange({ ...project, progress }); }
  return <main className="weave-page">
    <header className="weave-heading"><button onClick={onBack}>← Editor</button><div><h1>{project.name}</h1><p role="status">{saveStatus}</p></div><button onClick={() => setConfirmation('reset')}>Reiniciar</button></header>
    <section className="weave-information" aria-label="Dónde vas"><h2>{label} {project.progress.row} de {project.rows} · Punto {Math.min(project.cols, project.progress.stitch)}</h2><p>{rtl ? '← Derecha a izquierda' : '→ Izquierda a derecha'} · {done} de {project.cols} puntos hechos</p><p className="current-run" role="status">{runText}</p></section>
    <section className="drawing-panel" aria-label="Cuadrícula para tejer"><GridCanvas project={project} profile={profile} tool="paint" colorIndex={0} centers={false} selection={null} weaving={project.progress} onStroke={() => {}} onFill={() => {}} onSelect={() => {}} onMove={() => {}} /></section>
    <footer className="weave-dock">
      {saveFailed && <p className="error" role="alert">{saveStatus}</p>}
      <div className="weave-step"><label>Paso<select value={step} onChange={(event) => { const value = event.target.value === 'color-run' ? 'color-run' : Number(event.target.value); setStep(value); onChange({ ...project, tapStep: value }); }}><option value={1}>1 punto</option><option value={5}>5 puntos</option><option value={10}>10 puntos</option><option value="color-run">Tramo de color</option></select></label><button className="primary advance-button" disabled={finished} onClick={() => { const next = advanceProgress(project); if (next.needsNextRow) setConfirmation('next'); else apply(next.progress); }}>{finished ? 'Pieza terminada' : complete ? `Pasar a ${label.toLowerCase()} ${project.progress.row + 1}` : step === 'color-run' ? `Avanzar ${run?.remaining ?? 0} puntos` : `Avanzar ${Math.min(step, project.cols - done)} ${Math.min(step, project.cols - done) === 1 ? 'punto' : 'puntos'}`}</button></div>
      <div className="weave-secondary"><button disabled={complete} onClick={() => apply(advanceProgress(project, 1).progress)}>+1 punto</button><button disabled={!history.past.length} onClick={() => { const next = undoProgress(history); setHistory(next); onChange({ ...project, progress: next.present }); }}>Deshacer</button><button disabled={complete} onClick={() => apply(finishRow(project))}>Terminar {label.toLowerCase()}</button><button disabled={project.progress.row === 1} onClick={() => apply(previousRow(project))}>{label} anterior</button></div>
    </footer>
    {confirmation && <ConfirmDialog title={confirmation === 'reset' ? 'Reiniciar progreso' : `Empezar ${label.toLowerCase()} ${project.progress.row + 1}`} message={confirmation === 'reset' ? 'Volverás a la ' + label.toLowerCase() + ' 1, punto 1. El dibujo se conserva.' : `Terminaste ${label.toLowerCase()} ${project.progress.row}. ¿Empezar la siguiente?`} confirmLabel={confirmation === 'reset' ? 'Reiniciar progreso' : 'Empezar siguiente'} onCancel={() => setConfirmation(null)} onConfirm={() => { apply(confirmation === 'reset' ? { row: 1, stitch: 1 } : nextRow(project)); setConfirmation(null); }} />}
  </main>;
}
