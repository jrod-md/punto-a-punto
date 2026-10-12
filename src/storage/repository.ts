import { DEFAULT_PROFILES } from '../core/defaults';
import { packProject, unpackProject } from '../core/projectFile';
import type { PackedProject, ProjectFile } from '../core/projectFile';
import type { GaugeProfile, ProjectRecord } from '../core/types';

export interface Repository<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  save(value: T): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface LocalData {
  projects: Repository<ProjectRecord>;
  profiles: Repository<GaugeProfile>;
  settings: Repository<{ id: string; value: string }>;
  importProject(file: ProjectFile): Promise<void>;
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          'No se pudieron leer los datos guardados en este dispositivo.',
        ),
      );
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () =>
      reject(
        new Error(
          'No se pudieron guardar los cambios. Comprueba el espacio y los permisos del navegador.',
        ),
      );
  });
}

function repository<T extends { id: string }, Stored>(
  database: IDBDatabase,
  name: string,
  encode: (value: T) => Stored,
  decode: (value: Stored) => T,
): Repository<T> {
  return {
    async list() {
      const transaction = database.transaction(name, 'readonly');
      const records = await requestValue(
        transaction.objectStore(name).getAll() as IDBRequest<Stored[]>,
      );
      return records.map(decode);
    },
    async get(id) {
      const transaction = database.transaction(name, 'readonly');
      const record = await requestValue(
        transaction.objectStore(name).get(id) as IDBRequest<Stored | undefined>,
      );
      return record === undefined ? undefined : decode(record);
    },
    async save(value) {
      const encoded = encode(value);
      const transaction = database.transaction(name, 'readwrite');
      const done = completed(transaction);
      transaction.objectStore(name).put(encoded);
      await done;
    },
    async remove(id) {
      const transaction = database.transaction(name, 'readwrite');
      const done = completed(transaction);
      transaction.objectStore(name).delete(id);
      await done;
    },
  };
}

export async function openLocalData(
  databaseName = 'punto-a-punto',
): Promise<LocalData> {
  if (!globalThis.indexedDB)
    throw new Error(
      'Este navegador no permite guardar proyectos. Habilita el almacenamiento local.',
    );
  const request = indexedDB.open(databaseName, 2);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains('projects'))
      request.result.createObjectStore('projects', { keyPath: 'id' });
    if (!request.result.objectStoreNames.contains('profiles')) {
      const profiles = request.result.createObjectStore('profiles', {
        keyPath: 'id',
      });
      for (const profile of DEFAULT_PROFILES) profiles.put(profile);
    }
    if (!request.result.objectStoreNames.contains('settings'))
      request.result.createObjectStore('settings', { keyPath: 'id' });
  };
  request.onblocked = () => request.onerror?.(new Event('error'));
  const database = await requestValue(request);
  database.onversionchange = () => database.close();
  return {
    projects: repository<ProjectRecord, PackedProject>(
      database,
      'projects',
      packProject,
      unpackProject,
    ),
    profiles: repository<GaugeProfile, GaugeProfile>(
      database,
      'profiles',
      (value) => value,
      (value) => value,
    ),
    settings: repository<
      { id: string; value: string },
      { id: string; value: string }
    >(
      database,
      'settings',
      (value) => value,
      (value) => value,
    ),
    async importProject(file) {
      const packed = packProject(file.project);
      const existing = await requestValue(
        database
          .transaction('profiles', 'readonly')
          .objectStore('profiles')
          .get(file.profile.id) as IDBRequest<GaugeProfile | undefined>,
      );
      const keys: readonly (keyof GaugeProfile)[] = [
        'id',
        'name',
        'hookMm',
        'construction',
        'swatchStitches',
        'swatchRows',
        'swatchWidthCm',
        'swatchHeightCm',
        'yarnMeasuredCm',
        'yarnMeasuredStitches',
        'carriedFactor',
        'approximate',
        'metersPerBall',
      ];
      if (existing && keys.some((key) => existing[key] !== file.profile[key]))
        throw new Error(
          'Ya existe un perfil con ese identificador y medidas distintas. No se ha importado el proyecto.',
        );
      const transaction = database.transaction(
        ['projects', 'profiles'],
        'readwrite',
      );
      const done = completed(transaction);
      transaction.objectStore('profiles').put(file.profile);
      transaction.objectStore('projects').put(packed);
      await done;
    },
  };
}
