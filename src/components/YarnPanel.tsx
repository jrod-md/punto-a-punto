import { useMemo, useState } from 'react';
import { yarnSettings } from '../core/profiles';
import { yarn } from '../core/yarn';
import type { GaugeProfile, Project } from '../core/types';

export default function YarnPanel({ project, profile, onChange, onCalibrate }: { project: Project; profile: GaugeProfile; onChange(project: Project): void; onCalibrate(): void }) {
  const estimates = useMemo(() => yarn(project, profile).filter((entry) => entry.workedStitches > 0), [project, profile]);
  const [margin, setMargin] = useState(String(project.marginPercent));
  const [error, setError] = useState('');
  const format = new Intl.NumberFormat('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const total = estimates.reduce((sum, entry) => sum + entry.meters, 0);
  return <section aria-label="Estimación de hilo"><p>Es una estimación, no una cantidad exacta. Incluye las colas de inicio y remate y el margen de seguridad.</p>
    {profile.approximate && <div className="notice"><p>Esta muestra es aproximada. Calibra con tu hilo y tu aguja para mejorar la estimación.</p><button onClick={onCalibrate}>Calibrar mi muestra</button></div>}
    <ul className="yarn-list">{estimates.map((entry) => { const color = project.palette.find((item) => item.id === entry.colorId)!; return <li key={entry.colorId}><span className="color-dot" style={{ backgroundColor: color.hex }} /><span>{color.name}</span><strong>{format.format(entry.meters)} m</strong>{entry.balls !== undefined && <span>{entry.balls} {entry.balls === 1 ? 'ovillo' : 'ovillos'}</span>}</li>; })}</ul>
    <p className="yarn-total">Total estimado: <strong>{format.format(total)} m</strong></p><p>Margen aplicado: {new Intl.NumberFormat('es').format(project.marginPercent)} %.</p>
    <form noValidate onSubmit={(event) => { event.preventDefault(); try { if (!margin.trim()) throw new Error('Escribe el margen de seguridad.'); onChange(yarnSettings(project, Number(margin), project.carryAlways)); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Revisa el margen.'); } }}><label>Margen de seguridad (%)<input type="number" min={0} max={1000} step="any" value={margin} onChange={(event) => setMargin(event.target.value)} /></label>{error && <p className="error" role="alert">{error}</p>}<button type="submit">Aplicar margen</button></form>
    <label className="check-label"><input type="checkbox" checked={project.carryAlways} onChange={(event) => onChange(yarnSettings(project, project.marginPercent, event.target.checked))} />Llevar todos los colores usados en todas las filas</label><p className="subtle">Cuenta el hilo escondido también en las filas de un solo color; los colores sin usar no cuentan.</p>
  </section>;
}
