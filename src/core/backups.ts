import type { ProjectRecord } from './types';
export function overdueBackups(projects: readonly ProjectRecord[], exported: Readonly<Record<string,string>>, baseline: Readonly<Record<string,string>>, now: number): string[] {
  if (!Number.isFinite(now)) throw new RangeError('La fecha actual no es válida.');
  return projects.filter(project=>{const date=Date.parse(exported[project.id]??baseline[project.id]??project.updatedAt);return Number.isFinite(date)&&now-date>7*24*60*60*1000;}).map(project=>project.name);
}
