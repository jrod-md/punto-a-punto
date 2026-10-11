import { createRoot } from 'react-dom/client';
import App from '../src/App';
import type { LocalData, Repository } from '../src/storage/repository';
import type { GaugeProfile, ProjectRecord } from '../src/core/types';
import { TEST_PROFILE, TEST_PROJECT } from '../src/core/testFixtures';
import '../src/styles.css';

let project: ProjectRecord = { ...TEST_PROJECT, name: 'Prueba aislada de guardado fallido', updatedAt: '2026-10-11T18:00:00.000Z' };
let shouldFail = true;
const projects: Repository<ProjectRecord> = {
  async list() { return [project]; },
  async get() { return project; },
  async save(value) { if (shouldFail) { shouldFail = false; throw new Error('Fallo de guardado simulado.'); } project = value; },
  async remove() { throw new Error('Esta prueba no borra datos.'); },
};
const profiles: Repository<GaugeProfile> = {
  async list() { return [TEST_PROFILE]; },
  async get() { return TEST_PROFILE; },
  async save() { throw new Error('Esta prueba no modifica perfiles.'); },
  async remove() { throw new Error('Esta prueba no borra perfiles.'); },
};
const local: LocalData = { projects, profiles, async importProject() { throw new Error('Esta prueba no importa datos.'); } };
const root = document.querySelector('#root')!;
createRoot(root).render(<App openData={async () => local} />);
