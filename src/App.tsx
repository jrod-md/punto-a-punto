import { createId } from './storage/ids';
import { useEffect, useRef, useState } from 'react';
import { exportProjectFile, parseProjectFile } from './core/projectFile';
import type { GaugeProfile, Project, ProjectRecord } from './core/types';
import { openLocalData } from './storage/repository';
import type { LocalData } from './storage/repository';
import Editor from './components/Editor';
import ProjectForm from './components/ProjectForm';
import ConfirmDialog from './components/ConfirmDialog';
import Profiles from './components/Profiles';
import { profileProjectNames } from './core/profiles';

export default function App({ openData = openLocalData }: { openData?: () => Promise<LocalData> }) {
  const [data, setData] = useState<LocalData | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [profiles, setProfiles] = useState<GaugeProfile[]>([]);
  const [active, setActive] = useState<ProjectRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [managingProfiles, setManagingProfiles] = useState(false);
  const [calibratingId, setCalibratingId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; confirmLabel: string; action(): Promise<void> } | null>(null);
  const [saveStatus, setSaveStatus] = useState('Guardado en este dispositivo');
  const queue = useRef(Promise.resolve());
  const revision = useRef(0);
  const failedSave = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(() => {
    let cancelled = false;
    openData().then(async (local) => {
      const [savedProjects, savedProfiles] = await Promise.all([local.projects.list(), local.profiles.list()]);
      if (!cancelled) { setData(local); setProjects(savedProjects); setProfiles(savedProfiles); }
    }).catch(() => { if (!cancelled) setError('No se pudieron abrir los datos locales. Comprueba los permisos de almacenamiento del navegador y vuelve a cargar la página.'); });
    return () => { cancelled = true; };
  }, [openData]);

  function saveChange(project: Project) {
    if (!data) return;
    const record: ProjectRecord = { ...project, updatedAt: new Date().toISOString() };
    setActive(record);
    const version = ++revision.current;
    dirty.current = true;
    setSaveStatus('Guardando cambios…');
    queue.current = queue.current.then(async () => {
      try {
        await data.projects.save(record);
        setProjects((previous) => previous.map((entry) => entry.id === record.id ? record : entry));
        if (version === revision.current) { failedSave.current = false; dirty.current = false; setSaveStatus('Guardado en este dispositivo'); }
      } catch {
        failedSave.current = true;
        setSaveStatus('No se guardaron los cambios. Comprueba el espacio y los permisos del navegador.');
      }
    });
  }

  async function createProject(project: ProjectRecord) {
    if (!data) return;
    try {
      await data.projects.save(project);
      setProjects((previous) => [...previous, project]);
      setCreating(false); setActive(project); setError(''); setSaveStatus('Guardado en este dispositivo');
    } catch { setError('No se pudo crear el proyecto. Comprueba los permisos de almacenamiento.'); }
  }

  async function duplicate(project: ProjectRecord) {
    if (!data) return;
    try {
      const copy = { ...project, id: createId(), name: `${project.name} (copia)`, updatedAt: new Date().toISOString() };
      await data.projects.save(copy);
      setProjects((previous) => [...previous, copy]); setError('');
    } catch { setError('No se pudo duplicar el proyecto.'); }
  }

  async function saveProfile(profile: GaugeProfile) {
    if (!data) return;
    await data.profiles.save(profile);
    setProfiles((previous) => previous.some((entry) => entry.id === profile.id) ? previous.map((entry) => entry.id === profile.id ? profile : entry) : [...previous, profile]);
  }

  async function removeProfile(id: string) {
    if (!data) return;
    const names = profileProjectNames(id, await data.projects.list());
    if (names.length) throw new Error(`No puedes borrar esta muestra: la usan ${names.map((name) => `«${name}»`).join(', ')}.`);
    await data.profiles.remove(id);
    setProfiles((previous) => previous.filter((entry) => entry.id !== id));
  }

  async function remove(project: ProjectRecord) {
    if (!data) return;
    try { await data.projects.remove(project.id); setProjects((previous) => previous.filter((entry) => entry.id !== project.id)); setError(''); }
    catch { setError('No se pudo borrar el proyecto.'); }
  }

  function download(project: ProjectRecord) {
    const profile = profiles.find((entry) => entry.id === project.profileId);
    if (!profile) { setError('No se encontró la muestra de este proyecto.'); return; }
    const url = URL.createObjectURL(new Blob([exportProjectFile(project, profile)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `${project.name.replace(/[^\p{L}\p{N} _-]/gu, '_') || 'proyecto'}.json`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importFile(file: File) {
    if (!data) return;
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('El respaldo supera el máximo de 16 MB.');
      const imported = parseProjectFile(await file.text());
      const existing = await data.projects.get(imported.project.id);
      const normalizedExisting = existing ? parseProjectFile(exportProjectFile(existing, imported.profile)).project : undefined;
      const applyImport = async () => {
        try {
          await data.importProject(imported);
          const [savedProjects, savedProfiles] = await Promise.all([data.projects.list(), data.profiles.list()]);
          setProjects(savedProjects); setProfiles(savedProfiles); setError(''); setNotice(`Respaldo importado: ${imported.project.name}.`);
        } catch (reason) { setError(reason instanceof Error && !(reason instanceof DOMException) ? `No se pudo importar: ${reason.message}` : 'No se pudo guardar el respaldo. No se han reemplazado los datos.'); }
      };
      if (normalizedExisting && JSON.stringify(normalizedExisting) !== JSON.stringify(imported.project)) {
        setConfirmation({ title: 'Reemplazar proyecto', message: `Ya existe «${existing?.name}». El respaldo reemplazará su dibujo y sus medidas.`, confirmLabel: 'Reemplazar con respaldo', action: applyImport }); return;
      }
      await applyImport();
    } catch (reason) {
      setError(reason instanceof Error && !(reason instanceof DOMException) ? `No se pudo importar: ${reason.message}` : 'No se pudo leer el archivo. Elige un respaldo JSON válido.');
    }
  }

  if (!data) return <main className="page"><p className="eyebrow">PUNTO A PUNTO</p><h1>Tus proyectos</h1><p role={error ? 'alert' : 'status'}>{error || 'Abriendo tus proyectos guardados…'}</p></main>;
  if (managingProfiles) return <Profiles profiles={profiles} projects={projects} initialEditId={calibratingId} onSave={saveProfile} onRemove={removeProfile} onBack={() => { setManagingProfiles(false); setCalibratingId(undefined); }} />;
  const profile = active ? profiles.find((entry) => entry.id === active.profileId) : undefined;
  if (active && profile) return <Editor key={active.id} initialProject={active} profiles={profiles} saveStatus={saveStatus} onChange={saveChange} onCalibrate={(project) => {
    void queue.current.then(() => {
      if (failedSave.current) { setSaveStatus('El último cambio no está guardado. Exporta un respaldo desde el editor o vuelve a intentar una edición.'); return; }
      setActive({ ...project, updatedAt: active.updatedAt }); setCalibratingId(project.profileId); setManagingProfiles(true);
    });
  }} onBack={() => {
    void queue.current.then(() => {
      if (failedSave.current) { setSaveStatus('El último cambio no está guardado. Exporta un respaldo desde el editor o vuelve a intentar una edición.'); return; }
      setActive(null);
    });
  }} onExport={(project) => download({ ...project, updatedAt: projects.find((entry) => entry.id === project.id)?.updatedAt ?? active.updatedAt })} />;
  if (creating) return <main className="page narrow"><button className="quiet" onClick={() => { setCreating(false); setError(''); }}>← Proyectos</button><ProjectForm profiles={profiles} onCreate={(project) => { void createProject(project); }} />{error && <p role="alert" className="error">{error}</p>}</main>;

  return <main className="page">
    <header className="page-heading"><div><p className="eyebrow">PUNTO A PUNTO · TAPESTRY CROCHET</p><h1>Tus proyectos</h1><p>Tu hilo, tus medidas, tu diseño.</p></div><div className="page-actions"><button className="primary" onClick={() => setCreating(true)}>Crear proyecto</button><button onClick={() => { setCalibratingId(undefined); setManagingProfiles(true); }}>Mis muestras</button></div></header>
    <div className="backup-line"><label className="file-button">Importar respaldo JSON<input type="file" accept=".json,application/json" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importFile(file); }} /></label><p>Los proyectos se guardan en este navegador. Exporta un JSON para conservar un respaldo.</p></div>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && !error && <p role="status" className="notice">{notice}</p>}
    {!projects.length ? <section className="empty-state"><p className="eyebrow">UN DISEÑO EMPIEZA CON UNA MUESTRA</p><h2>Aquí aparecerá tu primer tejido</h2><p>Elige cuánto debe medir y dibuja punto a punto.</p><button className="primary" onClick={() => setCreating(true)}>Crear mi primer proyecto</button></section> : <ul className="project-list">{[...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((project) => <li key={project.id}>
      <div className="project-info"><h2>{project.name}</h2><p>{project.cols} puntos × {project.rows} filas · {project.construction === 'flat' ? 'En plano' : 'En redondo'}</p><p className="subtle">Última edición: {new Date(project.updatedAt).toLocaleString('es')}</p></div>
      <div className="project-actions"><button className="primary" onClick={() => { setActive(project); setSaveStatus('Guardado en este dispositivo'); }}>Abrir <span className="sr-only">{project.name}</span></button><button onClick={() => { void duplicate(project); }}>Duplicar <span className="sr-only">{project.name}</span></button><button onClick={() => download(project)}>Exportar <span className="sr-only">{project.name}</span></button><button className="danger" onClick={() => setConfirmation({ title: 'Borrar proyecto', message: `¿Borrar «${project.name}» de este dispositivo? Conserva un respaldo JSON si quieres recuperarlo.`, confirmLabel: 'Borrar proyecto', action: () => remove(project) })}>Borrar <span className="sr-only">{project.name}</span></button></div>
    </li>)}</ul>}
    {confirmation && <ConfirmDialog title={confirmation.title} message={confirmation.message} confirmLabel={confirmation.confirmLabel} onCancel={() => setConfirmation(null)} onConfirm={() => { const action = confirmation.action; setConfirmation(null); void action(); }} />}
  </main>;
}
