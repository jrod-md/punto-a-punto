import { createId } from '../storage/ids';
import { useState } from 'react';
import { calibratedProfile, calibrationSummary, profileDraft, validateProfileStep } from '../core/profiles';
import type { ProfileDraft } from '../core/profiles';
import type { GaugeProfile } from '../core/types';

interface Props { initial?: GaugeProfile | undefined; onSave(profile: GaugeProfile): Promise<void>; onCancel(): void }
const stepNames = ['Tu hilo y tu aguja', 'Mide tu muestra', 'Mide el hilo que usas', 'Tu muestra, en números'];

export default function ProfileWizard({ initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(() => profileDraft(initial));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileDraft, string>>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const format = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
  const field = (key: keyof ProfileDraft, label: string, unit: string, integer = false) => <label>{label}<input aria-label={label} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `error-${key}` : undefined} type={key === 'name' ? 'text' : 'number'} inputMode={key === 'name' ? 'text' : integer ? 'numeric' : 'decimal'} step={integer ? 1 : 'any'} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />{unit && <span className="subtle">{unit}</span>}{errors[key] && <span className="field-error" id={`error-${key}`}>{errors[key]}</span>}</label>;
  let summary = null;
  if (step === 3) {
    try { summary = calibrationSummary(calibratedProfile(draft, initial?.id ?? 'preview')); } catch { /* Step validation displays the error before advancing. */ }
  }
  return <section className="profile-wizard">
    <p className="eyebrow">TU MUESTRA · PASO {step + 1} DE 4</p><h1>{stepNames[step]}</h1>
    <form noValidate onSubmit={(event) => {
      event.preventDefault();
      const nextErrors = validateProfileStep(draft, step); setErrors(nextErrors); setError('');
      if (Object.keys(nextErrors).length) return;
      if (step < 3) { setStep(step + 1); return; }
      const next = calibratedProfile(draft, initial?.id ?? createId(), initial);
      setSaving(true);
      void onSave(next).catch(() => setError('No se pudo guardar la muestra. Comprueba el espacio y los permisos del navegador.')).finally(() => setSaving(false));
    }}>
      {step === 0 && <>{field('name', 'Nombre de la muestra', 'Por ejemplo: Algodón aguja 4')}{field('hookMm', 'Aguja en milímetros', 'Busca el número escrito en tu aguja.')}<label>¿Cómo tejiste la muestra?<select value={draft.construction} onChange={(event) => setDraft({ ...draft, construction: event.target.value === 'round' ? 'round' : 'flat' })}><option value="flat">En plano</option><option value="round">En redondo</option></select></label></>}
      {step === 1 && <><p>Teje una muestra de al menos 15 puntos y 15 filas. Mídela extendida, sin estirarla.</p><div className="field-pair">{field('swatchStitches', 'Puntos de la muestra', '', true)}{field('swatchRows', 'Filas de la muestra', '', true)}</div><div className="field-pair">{field('swatchWidthCm', 'Ancho en centímetros', '')}{field('swatchHeightCm', 'Alto en centímetros', '')}</div>{Number(draft.swatchStitches) > 0 && Number(draft.swatchRows) > 0 && (Number(draft.swatchStitches) < 15 || Number(draft.swatchRows) < 15) && <p className="notice">Puedes seguir con esta muestra pequeña. Con al menos 15 puntos y 15 filas, las medidas serán más fiables.</p>}</>}
      {step === 2 && <><p>Mide 2 m de hilo desde la aguja y pon una marca con un clip o un nudo flojo. Teje punto bajo hasta la marca. Cuenta cuántos puntos salieron.</p>{field('yarnMeasuredMeters', 'Largo de hilo medido en metros', 'Puedes usar otro largo: escribe aquí lo que mediste.')}{field('yarnMeasuredStitches', '¿Cuántos puntos salieron?', '', true)}</>}
      {step === 3 && <>{summary && <div className="calibration-summary"><p><strong>{format.format(summary.stitchesPer10Cm)} puntos y {format.format(summary.rowsPer10Cm)} filas en 10 cm</strong></p><p>{format.format(summary.yarnPerStitchCm)} cm de hilo por punto.</p><p>Una pieza de 40 × 40 cm serán <strong>{summary.piece.cols} puntos × {summary.piece.rows} filas</strong>.</p>{summary.smallSwatch && <p className="notice">La muestra tiene menos de 15 puntos o 15 filas. Puedes guardarla; una muestra mayor dará medidas más fiables.</p>}{initial?.approximate && <p className="subtle">Si conservas las medidas de fábrica, el perfil seguirá marcado como aproximado.</p>}</div>}{field('metersPerBall', 'Metros por ovillo (opcional)', 'Está en la etiqueta del hilo. Puedes añadirlo después.')}<details><summary>Hilo llevado</summary><p className="subtle">El factor habitual es 1,1. Ajusta este valor solo si conoces cuánto hilo llevas escondido dentro de tus puntos.</p>{field('carriedFactor', 'Factor de hilo llevado', '')}</details><p className="subtle">Al editar una muestra, todos los proyectos que la usan conservarán su dibujo y recalcularán sus medidas y su hilo.</p></>}
      {Object.keys(errors).length > 0 && <p role="alert" className="error">Revisa los campos indicados para continuar.</p>}{error && <p role="alert" className="error">{error}</p>}
      <div className="wizard-actions">{step > 0 && <button type="button" disabled={saving} onClick={() => { setStep(step - 1); setErrors({}); setError(''); }}>Anterior</button>}<button className="primary" disabled={saving} type="submit">{saving ? 'Guardando…' : step === 3 ? 'Guardar muestra' : 'Continuar'}</button><button type="button" disabled={saving} className="quiet" onClick={onCancel}>Cancelar</button></div>
    </form>
  </section>;
}
