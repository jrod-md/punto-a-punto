import { openLocalData } from '../src/storage/repository';
import { exportProjectFile, packProject, parseProjectFile } from '../src/core/projectFile';
import type { PackedProject } from '../src/core/projectFile';
import { TEST_PROFILE, TEST_PROJECT } from '../src/core/testFixtures';
import { calibratedProfile, profileDraft } from '../src/core/profiles';
import { createId } from '../src/storage/ids';

const results = document.querySelector('#results')!;
const summary = document.querySelector('#summary')!;
const button = document.querySelector<HTMLButtonElement>('#run')!;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function comparable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry: unknown) => comparable(entry)).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${comparable(entry)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}

async function openRaw(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('No se pudo abrir la base de prueba.'));
  });
}

button.onclick = async () => {
  button.disabled = true; results.textContent = ''; summary.textContent = 'Ejecutando…';
  let passed = 0;
  let failed = 0;
  async function check(name: string, action: () => Promise<void>) {
    const item = document.createElement('li');
    try { await action(); item.textContent = `Correcto: ${name}`; passed += 1; }
    catch (reason) { item.textContent = `Falló: ${name}. ${reason instanceof Error ? reason.message : 'Error desconocido'}`; failed += 1; }
    results.append(item);
  }
  try {
    const name = `punto-a-punto-pruebas-${createId()}`;
    const local = await openLocalData(name);
    const project = { ...TEST_PROJECT, updatedAt: '2026-10-11T18:00:00.000Z' };
    await check('Primer inicio: exactamente dos perfiles de fábrica', async () => {
      assert((await local.profiles.list()).length === 2, 'No se crearon los perfiles.');
      assert((await local.projects.list()).length === 0, 'La lista debe estar vacía.');
    });
    await check('Segundo inicio sin duplicar perfiles', async () => {
      const reopened = await openLocalData(name);
      assert((await reopened.profiles.list()).length === 2, 'Se duplicaron los perfiles.');
    });
    await check('Guardar, listar y leer un proyecto completo', async () => {
      await local.profiles.save(TEST_PROFILE); await local.projects.save(project);
      assert(comparable(await local.projects.get(project.id)) === comparable(project), 'El proyecto cambió.');
      assert((await local.projects.list()).length === 1, 'No aparece en la lista.');
    });
    await check('Crear y editar una muestra calibrada; conservarla al reabrir', async () => {
      const own = calibratedProfile({ ...profileDraft(), name: 'Muestra aislada', hookMm: '4', swatchStitches: '20', swatchRows: '20', swatchWidthCm: '10', swatchHeightCm: '9', yarnMeasuredStitches: '50' }, 'own-profile');
      await local.profiles.save(own);
      await local.profiles.save({ ...own, metersPerBall: 100 });
      const reopened = await openLocalData(name);
      assert(comparable(await reopened.profiles.get(own.id)) === comparable({ ...own, metersPerBall: 100 }), 'La muestra editada no se conservó.');
    });
    await check('Duplicar y quitar una muestra sin alterar el original', async () => {
      const own = (await local.profiles.get('own-profile'))!;
      await local.profiles.save({ ...own, id: 'own-copy', name: `${own.name} (copia)` });
      assert((await local.profiles.list()).some((entry) => entry.id === 'own-copy'), 'No se duplicó la muestra.');
      await local.profiles.remove('own-copy'); await local.profiles.remove('own-profile');
      assert((await local.profiles.get('own-copy')) === undefined && (await local.profiles.get(TEST_PROFILE.id)) !== undefined, 'El borrado afectó otra muestra.');
    });
    await check('Celdas en IndexedDB: Uint8Array y un byte por celda', async () => {
      const raw = await openRaw(name);
      const packed = await new Promise<PackedProject>((resolve, reject) => {
        const request = raw.transaction('projects').objectStore('projects').get(project.id) as IDBRequest<PackedProject>;
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('No se pudo leer el registro.'));
      });
      raw.close(); assert(packed.cells instanceof Uint8Array && packed.cells.byteLength === project.cells.length, 'Las celdas no están compactadas.');
    });
    await check('Actualizar un registro sin crear duplicados', async () => {
      await local.projects.save({ ...project, name: 'Nombre actualizado' });
      assert((await local.projects.get(project.id))?.name === 'Nombre actualizado', 'La edición no se guardó.');
      assert((await local.projects.list()).length === 1, 'Se duplicó el registro.');
    });
    await check('Progreso al final de fila, tramo de color y metadatos al reabrir', async () => {
      await local.projects.save({ ...project, progress: { row: 2, stitch: project.cols + 1 }, tapStep: 'color-run' });
      await local.settings.save({ id: `backup:${project.id}`, value: '2026-10-11T12:00:00Z' });
      const reopened = await openLocalData(name);
      const saved = await reopened.projects.get(project.id);
      assert(saved?.progress.stitch === project.cols + 1 && saved.tapStep === 'color-run', 'Se perdió el progreso o el paso.');
      assert((await reopened.settings.get(`backup:${project.id}`))?.value === '2026-10-11T12:00:00Z', 'Se perdió la fecha del respaldo.');
    });
    await check('Migrar IndexedDB de versión 1 a 2 sin alterar proyectos ni muestras', async () => {
      const legacyName = `${name}-legacy`;
      const request = indexedDB.open(legacyName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('projects', { keyPath: 'id' }).put(packProject(project));
        request.result.createObjectStore('profiles', { keyPath: 'id' }).put(TEST_PROFILE);
      };
      const legacy = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('No se pudo crear la base antigua.')); });
      legacy.close();
      const upgraded = await openLocalData(legacyName);
      assert(comparable(await upgraded.projects.get(project.id)) === comparable(project), 'Cambió el proyecto durante la migración.');
      assert(comparable(await upgraded.profiles.list()) === comparable([TEST_PROFILE]), 'Cambió o se duplicó la muestra antigua.');
      await upgraded.settings.save({ id: 'ios-install-tip', value: 'shown' });
      assert((await upgraded.settings.get('ios-install-tip'))?.value === 'shown', 'La nueva tabla no funciona.');
      await new Promise<void>((resolve, reject) => { const upgrade = indexedDB.open(legacyName, 3); upgrade.onsuccess = () => { upgrade.result.close(); const deletion = indexedDB.deleteDatabase(legacyName); deletion.onsuccess = () => resolve(); deletion.onerror = () => reject(new Error('No se pudo limpiar la base antigua.')); }; upgrade.onerror = () => reject(new Error('No se pudo cerrar la base antigua.')); });
    });
    await check('Exportar, borrar e importar: proyecto y perfil idénticos', async () => {
      const file = parseProjectFile(exportProjectFile(project, TEST_PROFILE));
      await local.projects.remove(project.id); await local.profiles.remove(TEST_PROFILE.id);
      assert(await local.projects.get(project.id) === undefined, 'No se borró.');
      await local.importProject(file);
      assert(comparable(await local.projects.get(project.id)) === comparable(project), 'El respaldo cambió el proyecto.');
      assert(comparable(await local.profiles.get(TEST_PROFILE.id)) === comparable(TEST_PROFILE), 'El respaldo cambió el perfil.');
    });
    await check('Archivo inválido rechazado sin modificar los datos', async () => {
      const before = JSON.stringify(await local.projects.list());
      let rejected = false;
      try { const file = parseProjectFile('{"formatVersion":1,"project":{}}'); await local.importProject(file); } catch { rejected = true; }
      assert(rejected && before === JSON.stringify(await local.projects.list()), 'Se dañaron los datos existentes.');
    });
    await check('Conflicto de perfil rechazado sin reemplazar proyecto ni muestra', async () => {
      const before = JSON.stringify(await local.projects.list());
      let rejected = false;
      try { await local.importProject({ formatVersion: 1, project: { ...project, name: 'No debe guardarse' }, profile: { ...TEST_PROFILE, swatchWidthCm: 20 } }); } catch { rejected = true; }
      assert(rejected && before === JSON.stringify(await local.projects.list()), 'Se reemplazó el proyecto.');
      assert((await local.profiles.get(TEST_PROFILE.id))?.swatchWidthCm === 10, 'Se reemplazó el perfil.');
    });
    await check('Proyecto inválido rechazado antes de cualquier escritura', async () => {
      let rejected = false;
      try { await local.importProject({ formatVersion: 1, project: { ...project, cells: [-1] }, profile: { ...TEST_PROFILE, id: 'perfil-que-no-debe-crearse' } }); } catch { rejected = true; }
      assert(rejected && await local.profiles.get('perfil-que-no-debe-crearse') === undefined, 'Se creó un registro parcial.');
    });
    await check('Guardado fallido comunica un error', async () => {
      const dbRequest = indexedDB.open(name, 3);
      const database = await new Promise<IDBDatabase>((resolve, reject) => { dbRequest.onsuccess = () => resolve(dbRequest.result); dbRequest.onerror = () => reject(new Error('No se pudo cerrar la conexión de prueba.')); });
      database.close();
      let rejected = false;
      try { await local.projects.save(project); } catch { rejected = true; }
      assert(rejected, 'El guardado no debe indicar éxito.');
    });
    await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); request.onerror = () => reject(new Error('No se pudo limpiar la base de prueba.')); });
    summary.textContent = `${passed} comprobaciones correctas; ${failed} fallidas. Base de prueba eliminada.`;
  } catch (reason) { summary.textContent = `No se pudo completar la prueba: ${reason instanceof Error ? reason.message : 'error desconocido'}`; }
  button.disabled = false;
};
