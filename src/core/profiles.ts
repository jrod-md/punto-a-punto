import { gauge } from './gauge';
import { sizing } from './sizing';
import type { Construction, GaugeProfile, Project } from './types';

export interface ProfileDraft {
  name: string;
  hookMm: string;
  construction: Construction;
  swatchStitches: string;
  swatchRows: string;
  swatchWidthCm: string;
  swatchHeightCm: string;
  yarnMeasuredMeters: string;
  yarnMeasuredStitches: string;
  carriedFactor: string;
  metersPerBall: string;
}

export function profileDraft(profile?: GaugeProfile): ProfileDraft {
  return {
    name: profile?.name ?? '', hookMm: profile ? String(profile.hookMm) : '', construction: profile?.construction ?? 'flat',
    swatchStitches: profile ? String(profile.swatchStitches) : '', swatchRows: profile ? String(profile.swatchRows) : '',
    swatchWidthCm: profile ? String(profile.swatchWidthCm) : '', swatchHeightCm: profile ? String(profile.swatchHeightCm) : '',
    yarnMeasuredMeters: profile ? String(profile.yarnMeasuredCm / 100) : '2',
    yarnMeasuredStitches: profile ? String(profile.yarnMeasuredStitches) : '', carriedFactor: String(profile?.carriedFactor ?? 1.1),
    metersPerBall: profile?.metersPerBall === undefined ? '' : String(profile.metersPerBall),
  };
}

export function validateProfileStep(draft: ProfileDraft, step: number): Partial<Record<keyof ProfileDraft, string>> {
  const errors: Partial<Record<keyof ProfileDraft, string>> = {};
  const check = (key: keyof ProfileDraft, label: string, max: number, integer = false, allowZero = false) => {
    const value = Number(draft[key]);
    if (!draft[key].trim()) errors[key] = `Escribe ${label}.`;
    else if (!Number.isFinite(value) || (allowZero ? value < 0 : value < (integer ? 1 : 0.01)) || value > max || (integer && !Number.isSafeInteger(value))) {
      errors[key] = `${label} debe ser ${integer ? 'un número entero' : 'un número'} desde ${allowZero ? '0' : integer ? '1' : '0,01'} y hasta ${max}.`;
    }
  };
  if (step === 0) {
    if (!draft.name.trim() || draft.name.trim().length > 120) errors.name = 'Escribe un nombre de hasta 120 caracteres.';
    check('hookMm', 'la aguja en milímetros', 50);
    if (draft.construction !== 'flat' && draft.construction !== 'round') errors.construction = 'Elige en plano o en redondo.';
  } else if (step === 1) {
    check('swatchStitches', 'los puntos de la muestra', 10000, true); check('swatchRows', 'las filas de la muestra', 10000, true);
    check('swatchWidthCm', 'el ancho en centímetros', 1000); check('swatchHeightCm', 'el alto en centímetros', 1000);
  } else if (step === 2) {
    check('yarnMeasuredMeters', 'el largo de hilo en metros', 10000); check('yarnMeasuredStitches', 'los puntos hasta la marca', 1000000, true);
  } else if (step === 3) {
    check('carriedFactor', 'el factor de hilo llevado', 10, false, true);
    if (draft.metersPerBall.trim()) check('metersPerBall', 'los metros por ovillo', 100000);
  } else throw new RangeError('El paso de calibración no es válido.');
  return errors;
}

export function calibratedProfile(draft: ProfileDraft, id: string, previous?: GaugeProfile): GaugeProfile {
  for (let step = 0; step < 4; step += 1) {
    const errors = Object.values(validateProfileStep(draft, step));
    if (errors.length) throw new RangeError(errors[0]);
  }
  if (!id.trim()) throw new RangeError('Falta el identificador de la muestra.');
  const profile: GaugeProfile = {
    id, name: draft.name.trim(), hookMm: Number(draft.hookMm), construction: draft.construction,
    swatchStitches: Number(draft.swatchStitches), swatchRows: Number(draft.swatchRows),
    swatchWidthCm: Number(draft.swatchWidthCm), swatchHeightCm: Number(draft.swatchHeightCm),
    yarnMeasuredCm: Number(draft.yarnMeasuredMeters) * 100, yarnMeasuredStitches: Number(draft.yarnMeasuredStitches),
    carriedFactor: Number(draft.carriedFactor), approximate: false,
    ...(draft.metersPerBall.trim() ? { metersPerBall: Number(draft.metersPerBall) } : {}),
  };
  const measurementKeys = ['swatchStitches', 'swatchRows', 'swatchWidthCm', 'swatchHeightCm', 'yarnMeasuredCm', 'yarnMeasuredStitches'] as const;
  if (previous?.approximate && measurementKeys.every((key) => profile[key] === previous[key])) profile.approximate = true;
  return profile;
}

export function calibrationSummary(profile: GaugeProfile) {
  const measures = gauge(profile);
  return { stitchesPer10Cm: 10 / measures.stitchWidthCm, rowsPer10Cm: 10 / measures.rowHeightCm,
    yarnPerStitchCm: measures.yarnPerStitchCm, piece: sizing(profile, 40, 40),
    smallSwatch: profile.swatchStitches < 15 || profile.swatchRows < 15 };
}

export function profileProjectNames(profileId: string, projects: readonly Project[]): string[] {
  return projects.filter((project) => project.profileId === profileId).map((project) => project.name);
}

export function changeProjectProfile(project: Project, profile: GaugeProfile): Project {
  gauge(profile);
  return profile.id === project.profileId ? project : { ...project, profileId: profile.id };
}

export function yarnSettings(project: Project, marginPercent: number, carryAlways: boolean): Project {
  if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent > 1000) throw new RangeError('El margen debe estar entre 0 y 1000 %.');
  return project.marginPercent === marginPercent && project.carryAlways === carryAlways ? project : { ...project, marginPercent, carryAlways };
}
