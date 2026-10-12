import { expect, it } from 'vitest';
import { overdueBackups } from './backups';
import { TEST_PROJECT } from './testFixtures';
it('reminds only after seven days and keeps the baseline when edits happen',()=>{
  const now=Date.parse('2026-10-11T00:00:00Z');const project={...TEST_PROJECT,updatedAt:'2026-10-04T00:00:00Z'};
  expect(overdueBackups([project],{},{},now)).toEqual([]);
  expect(overdueBackups([{...project,updatedAt:'2026-10-11T00:00:00Z'}],{},{[project.id]:'2026-10-03T00:00:00Z'},now)).toEqual(['Ejemplo']);
  expect(overdueBackups([project],{[project.id]:'2026-10-10T00:00:00Z'},{},now)).toEqual([]);
  expect(overdueBackups([{...project,updatedAt:'inválida'}],{},{},now)).toEqual([]);
  expect(()=>overdueBackups([],{}, {},NaN)).toThrow();
});
