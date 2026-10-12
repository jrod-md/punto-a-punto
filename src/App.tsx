import { createId } from './storage/ids';
import { useEffect, useRef, useState } from 'react';
import { exportProjectFile, parseProjectFile } from './core/projectFile';
import type { GaugeProfile, Project, ProjectRecord } from './core/types';
import { openLocalData } from './storage/repository';
import type { LocalData } from './storage/repository';
import Editor from './components/Editor';
import ProjectForm from './components/ProjectForm';
import ImageImport from './components/ImageImport';
import ProjectThumb from './components/ProjectThumb';
import {
  GridPencilIcon,
  Meadow,
  PictureIcon,
  Sheep,
  YarnBall,
} from './components/Art';
import ConfirmDialog from './components/ConfirmDialog';
import Profiles from './components/Profiles';
import { profileProjectNames } from './core/profiles';
import Pattern from './components/Pattern';
import Weave from './components/Weave';
import { adjustProgress } from './core/weaving';
import { overdueBackups } from './core/backups';
import { DEFAULT_PROFILES } from './core/defaults';
import { createExampleProject, EXAMPLE_DRAWINGS } from './core/examples';
import type { ExampleDrawing } from './core/examples';
import {
  needsIosInstallTip,
  requestPersistentStorage,
} from './platform/install';

export default function App({
  openData = openLocalData,
}: {
  openData?: () => Promise<LocalData>;
}) {
  const [data, setData] = useState<LocalData | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [profiles, setProfiles] = useState<GaugeProfile[]>([]);
  const [active, setActive] = useState<ProjectRecord | null>(null);
  const [screen, setScreen] = useState<'editor' | 'pattern' | 'weave'>(
    'editor',
  );
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [openedAt] = useState(() => Date.now());
  const [installTip, setInstallTip] = useState(false);
  const [creating, setCreating] = useState(false);
  const [startingExample, setStartingExample] = useState(false);
  const [mirror, setMirror] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [managingProfiles, setManagingProfiles] = useState(false);
  const [calibratingId, setCalibratingId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    action(): Promise<void>;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState('Guardado en este dispositivo');
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const failedSave = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    let cancelled = false;
    openData()
      .then(async (local) => {
        const [savedProjects, savedProfiles, savedSettings] = await Promise.all(
          [local.projects.list(), local.profiles.list(), local.settings.list()],
        );
        if (cancelled) return;
        const values = Object.fromEntries(
          savedSettings.map((entry) => [entry.id, entry.value]),
        );
        for (const project of savedProjects) {
          const id = `baseline:${project.id}`;
          if (!values[id]) {
            values[id] = project.updatedAt;
            await local.settings
              .save({ id, value: project.updatedAt })
              .catch(() => {});
          }
        }
        const standalone =
          matchMedia('(display-mode: standalone)').matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          );
        const showTip = needsIosInstallTip(
          navigator.userAgent,
          navigator.platform,
          navigator.maxTouchPoints,
          standalone,
          values['ios-install-tip'] === 'shown',
        );
        if (showTip) {
          values['ios-install-tip'] = 'shown';
          await local.settings
            .save({ id: 'ios-install-tip', value: 'shown' })
            .catch(() => {});
        }
        void requestPersistentStorage(navigator.storage);
        if (!cancelled) {
          setData(local);
          setProjects(savedProjects);
          setProfiles(savedProfiles);
          setSettings(values);
          setInstallTip(showTip);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'No se pudieron abrir los datos locales. Comprueba los permisos de almacenamiento del navegador y vuelve a cargar la página.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [openData]);

  function saveChange(project: Project) {
    if (!data) return;
    const record: ProjectRecord = {
      ...project,
      progress: adjustProgress(project),
      updatedAt: new Date().toISOString(),
    };
    setActive(record);
    const version = ++revision.current;
    dirty.current = true;
    setSaveStatus('Guardando cambios…');
    queue.current = queue.current.then(async () => {
      try {
        await data.projects.save(record);
        setProjects((previous) =>
          previous.map((entry) => (entry.id === record.id ? record : entry)),
        );
        if (version === revision.current) {
          failedSave.current = false;
          dirty.current = false;
          setSaveStatus('Guardado en este dispositivo');
        }
      } catch {
        failedSave.current = true;
        setSaveStatus(
          'No se guardaron los cambios. Comprueba el espacio y los permisos del navegador.',
        );
      }
    });
  }

  async function createProject(project: ProjectRecord) {
    if (!data) return;
    try {
      await data.projects.save(project);
      setProjects((previous) => [...previous, project]);
      await data.settings
        .save({ id: `baseline:${project.id}`, value: project.updatedAt })
        .catch(() => {});
      setSettings((previous) => ({
        ...previous,
        [`baseline:${project.id}`]: project.updatedAt,
      }));
      setCreating(false);
      setImageFile(null);
      setScreen('editor');
      setActive(project);
      setMirror(false);
      setError('');
      setSaveStatus('Guardado en este dispositivo');
    } catch {
      setError(
        'No se pudo crear el proyecto. Comprueba los permisos de almacenamiento.',
      );
    }
  }

  async function duplicate(project: ProjectRecord) {
    if (!data) return;
    try {
      const copy = {
        ...project,
        id: createId(),
        name: `${project.name} (copia)`,
        updatedAt: new Date().toISOString(),
      };
      await data.projects.save(copy);
      setProjects((previous) => [...previous, copy]);
      setError('');
      await data.settings
        .save({ id: `baseline:${copy.id}`, value: copy.updatedAt })
        .catch(() => {});
      setSettings((previous) => ({
        ...previous,
        [`baseline:${copy.id}`]: copy.updatedAt,
      }));
    } catch {
      setError('No se pudo duplicar el proyecto.');
    }
  }

  async function startExample(drawing: ExampleDrawing) {
    if (startingExample) return;
    setStartingExample(true);
    try {
      let profile = profiles.find((entry) => entry.hookMm === 4);
      if (!profile) {
        profile = { ...DEFAULT_PROFILES[1]!, id: createId() };
        await saveProfile(profile);
      }
      await createProject({
        ...createExampleProject(drawing, profile, createId()),
        updatedAt: new Date().toISOString(),
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudo abrir el ejemplo.',
      );
    } finally {
      setStartingExample(false);
    }
  }

  async function saveProfile(profile: GaugeProfile) {
    if (!data) return;
    await data.profiles.save(profile);
    setProfiles((previous) =>
      previous.some((entry) => entry.id === profile.id)
        ? previous.map((entry) => (entry.id === profile.id ? profile : entry))
        : [...previous, profile],
    );
  }

  async function removeProfile(id: string) {
    if (!data) return;
    const names = profileProjectNames(id, await data.projects.list());
    if (names.length)
      throw new Error(
        `No puedes borrar esta muestra: la usan ${names.map((name) => `«${name}»`).join(', ')}.`,
      );
    await data.profiles.remove(id);
    setProfiles((previous) => previous.filter((entry) => entry.id !== id));
  }

  async function remove(project: ProjectRecord) {
    if (!data) return;
    try {
      await data.projects.remove(project.id);
      setProjects((previous) =>
        previous.filter((entry) => entry.id !== project.id),
      );
      setError('');
    } catch {
      setError('No se pudo borrar el proyecto.');
    }
  }

  function download(project: ProjectRecord) {
    const profile = profiles.find((entry) => entry.id === project.profileId);
    if (!profile) {
      setError('No se encontró la muestra de este proyecto.');
      return;
    }
    const url = URL.createObjectURL(
      new Blob([exportProjectFile(project, profile)], {
        type: 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^\p{L}\p{N} _-]/gu, '_') || 'proyecto'}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (data) {
      const value = new Date().toISOString();
      void data.settings
        .save({ id: `backup:${project.id}`, value })
        .then(() =>
          setSettings((previous) => ({
            ...previous,
            [`backup:${project.id}`]: value,
          })),
        )
        .catch(() => {});
    }
  }

  async function importFile(file: File) {
    if (!data) return;
    try {
      if (file.size > 16 * 1024 * 1024)
        throw new Error('El respaldo supera el máximo de 16 MB.');
      const imported = parseProjectFile(await file.text());
      const existing = await data.projects.get(imported.project.id);
      const normalizedExisting = existing
        ? parseProjectFile(exportProjectFile(existing, imported.profile))
            .project
        : undefined;
      const applyImport = async () => {
        try {
          await data.importProject(imported);
          const backedUpAt = new Date().toISOString();
          await data.settings
            .save({ id: `backup:${imported.project.id}`, value: backedUpAt })
            .catch(() => {});
          setSettings((previous) => ({
            ...previous,
            [`backup:${imported.project.id}`]: backedUpAt,
          }));
          const [savedProjects, savedProfiles] = await Promise.all([
            data.projects.list(),
            data.profiles.list(),
          ]);
          setProjects(savedProjects);
          setProfiles(savedProfiles);
          setError('');
          setNotice(`Respaldo importado: ${imported.project.name}.`);
        } catch (reason) {
          setError(
            reason instanceof Error && !(reason instanceof DOMException)
              ? `No se pudo importar: ${reason.message}`
              : 'No se pudo guardar el respaldo. No se han reemplazado los datos.',
          );
        }
      };
      if (
        normalizedExisting &&
        JSON.stringify(normalizedExisting) !== JSON.stringify(imported.project)
      ) {
        setConfirmation({
          title: 'Reemplazar proyecto',
          message: `Ya existe «${existing?.name}». El respaldo reemplazará su dibujo y sus medidas.`,
          confirmLabel: 'Reemplazar con respaldo',
          action: applyImport,
        });
        return;
      }
      await applyImport();
    } catch (reason) {
      setError(
        reason instanceof Error && !(reason instanceof DOMException)
          ? `No se pudo importar: ${reason.message}`
          : 'No se pudo leer el archivo. Elige un respaldo JSON válido.',
      );
    }
  }

  if (!data)
    return (
      <main className="page">
        <p className="eyebrow">PUNTO A PUNTO</p>
        <h1>Tus proyectos</h1>
        <p role={error ? 'alert' : 'status'}>
          {error || 'Abriendo tus proyectos guardados…'}
        </p>
      </main>
    );
  if (managingProfiles)
    return (
      <Profiles
        profiles={profiles}
        projects={projects}
        initialEditId={calibratingId}
        onSave={saveProfile}
        onRemove={removeProfile}
        onBack={() => {
          setManagingProfiles(false);
          setCalibratingId(undefined);
        }}
      />
    );
  const profile = active
    ? profiles.find((entry) => entry.id === active.profileId)
    : undefined;
  if (active && profile && screen === 'pattern')
    return (
      <Pattern
        project={active}
        profile={profile}
        onBack={() => setScreen('editor')}
      />
    );
  if (active && profile && screen === 'weave')
    return (
      <Weave
        key={active.id}
        initialProject={active}
        profile={profile}
        saveStatus={saveStatus}
        onChange={saveChange}
        onBack={() => setScreen('editor')}
      />
    );
  if (active && profile)
    return (
      <Editor
        key={active.id}
        initialProject={active}
        profiles={profiles}
        saveStatus={saveStatus}
        mirror={mirror}
        onMirrorChange={setMirror}
        onChange={saveChange}
        onNavigate={(project, nextScreen) => {
          void queue.current.then(() => {
            setActive({ ...project, updatedAt: active.updatedAt });
            setScreen(nextScreen);
          });
        }}
        onCalibrate={(project) => {
          void queue.current.then(() => {
            if (failedSave.current) {
              setSaveStatus(
                'El último cambio no está guardado. Exporta un respaldo desde el editor o vuelve a intentar una edición.',
              );
              return;
            }
            setActive({ ...project, updatedAt: active.updatedAt });
            setCalibratingId(project.profileId);
            setManagingProfiles(true);
          });
        }}
        onBack={() => {
          void queue.current.then(() => {
            if (failedSave.current) {
              setSaveStatus(
                'El último cambio no está guardado. Exporta un respaldo desde el editor o vuelve a intentar una edición.',
              );
              return;
            }
            setActive(null);
            setMirror(false);
          });
        }}
        onExport={(project) =>
          download({
            ...project,
            updatedAt:
              projects.find((entry) => entry.id === project.id)?.updatedAt ??
              active.updatedAt,
          })
        }
      />
    );
  if (imageFile)
    return (
      <main className="page narrow">
        <ImageImport
          profiles={profiles}
          initialFile={imageFile}
          onCancel={() => {
            setImageFile(null);
            setError('');
          }}
          onComplete={(project) => {
            void createProject({
              ...project,
              updatedAt: new Date().toISOString(),
            });
          }}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </main>
    );
  if (creating)
    return (
      <main className="page narrow">
        <button
          className="quiet"
          onClick={() => {
            setCreating(false);
            setError('');
          }}
        >
          ← Proyectos
        </button>
        <ProjectForm
          profiles={profiles}
          onCreate={(project) => {
            void createProject(project);
          }}
        />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </main>
    );

  const backupDates = Object.fromEntries(
    Object.entries(settings)
      .filter(([id]) => id.startsWith('backup:'))
      .map(([id, value]) => [id.slice(7), value]),
  );
  const baselines = Object.fromEntries(
    Object.entries(settings)
      .filter(([id]) => id.startsWith('baseline:'))
      .map(([id, value]) => [id.slice(9), value]),
  );
  const overdue = overdueBackups(projects, backupDates, baselines, openedAt);
  return (
    <main className="page">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Punto a punto</p>
          <h1>¿Qué vas a tejer hoy?</h1>
        </div>
        <div className="hero-flock">
          <YarnBall className="hero-yarn" />
          <Sheep className="hero-sheep" />
        </div>
        <Meadow className="hero-meadow" />
      </header>
      <div className="start-actions">
        <label className="file-button primary start-action">
          <PictureIcon />
          <span className="start-title">Empezar con una imagen</span>
          <span className="start-hint">
            Un pixel art o la captura de un patrón
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                setError('');
                setImageFile(file);
              }
            }}
          />
        </label>
        <button className="start-action" onClick={() => setCreating(true)}>
          <GridPencilIcon />
          <span className="start-title">Dibujar desde cero</span>
          <span className="start-hint">
            Eliges la medida y pintas punto a punto
          </span>
        </button>
      </div>
      {projects.length < 3 && (
        <section className="examples" aria-labelledby="examples-title">
          <h2 className="section-title" id="examples-title">
            O prueba con un ejemplo
          </h2>
          <div className="example-row">
            {EXAMPLE_DRAWINGS.map((drawing) => (
              <button
                key={drawing.id}
                disabled={startingExample}
                onClick={() => {
                  void startExample(drawing);
                }}
              >
                <ProjectThumb
                  project={{
                    ...createExampleProject(
                      drawing,
                      DEFAULT_PROFILES[1]!,
                      `thumb-${drawing.id}`,
                    ),
                    cols: drawing.cols,
                    rows: drawing.rows,
                    cells: drawing.cells,
                  }}
                />
                <span>{drawing.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {installTip && (
        <aside className="notice" role="status">
          <p>
            Para no perder tus diseños, en Safari toca Compartir y «Agregar a la
            pantalla de inicio».
          </p>
          <button onClick={() => setInstallTip(false)}>Entendido</button>
        </aside>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <h2 className="section-title">Tus proyectos</h2>
      {overdue.length > 0 && (
        <p className="subtle" role="status">
          Hace más de 7 días que{' '}
          {overdue.length === 1
            ? 'este proyecto no tiene'
            : 'estos proyectos no tienen'}{' '}
          una copia guardada: {overdue.join(', ')}. Usa «Más» y «Guardar copia».
        </p>
      )}
      {!projects.length ? (
        <div className="empty-projects">
          <Sheep asleep />
          <p>
            <strong>Todavía no hay nada por aquí</strong>
          </p>
          <p>Lo que diseñes se guarda solo en este dispositivo.</p>
        </div>
      ) : (
        <ul className="project-list with-thumbs">
          {[...projects]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((project) => (
              <li key={project.id}>
                <ProjectThumb project={project} />
                <div className="project-info">
                  <h3>{project.name}</h3>
                  <p className="subtle">
                    {project.cols} × {project.rows} puntos ·{' '}
                    {new Date(project.updatedAt).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="project-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      setScreen('editor');
                      setActive(project);
                      setSaveStatus('Guardado en este dispositivo');
                    }}
                  >
                    Abrir <span className="sr-only">{project.name}</span>
                  </button>
                  <button
                    onClick={() => {
                      setScreen('weave');
                      setActive(project);
                      setSaveStatus('Guardado en este dispositivo');
                    }}
                  >
                    Tejer <span className="sr-only">{project.name}</span>
                  </button>
                  <details className="more">
                    <summary>
                      Más <span className="sr-only">sobre {project.name}</span>
                    </summary>
                    <div className="more-actions">
                      <button
                        onClick={() => {
                          void duplicate(project);
                        }}
                      >
                        Duplicar
                      </button>
                      <button onClick={() => download(project)}>
                        Guardar copia
                      </button>
                      <button
                        className="danger"
                        onClick={() =>
                          setConfirmation({
                            title: 'Borrar proyecto',
                            message: `¿Borrar «${project.name}» de este dispositivo? Si quieres recuperarlo después, guarda antes una copia.`,
                            confirmLabel: 'Borrar proyecto',
                            action: () => remove(project),
                          })
                        }
                      >
                        Borrar
                      </button>
                    </div>
                  </details>
                </div>
              </li>
            ))}
        </ul>
      )}
      <footer className="home-footer">
        <button
          className="quiet"
          onClick={() => {
            setCalibratingId(undefined);
            setManagingProfiles(true);
          }}
        >
          Mis muestras
        </button>
        <label className="file-button quiet">
          Abrir una copia guardada
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void importFile(file);
            }}
          />
        </label>
      </footer>
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            const action = confirmation.action;
            setConfirmation(null);
            void action();
          }}
        />
      )}
    </main>
  );
}
