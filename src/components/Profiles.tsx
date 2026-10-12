import { createId } from '../storage/ids';
import { useState } from 'react';
import { profileProjectNames } from '../core/profiles';
import type { GaugeProfile, ProjectRecord } from '../core/types';
import ConfirmDialog from './ConfirmDialog';
import ProfileWizard from './ProfileWizard';

interface Props {
  profiles: GaugeProfile[];
  projects: ProjectRecord[];
  initialEditId?: string | undefined;
  onBack(): void;
  onSave(profile: GaugeProfile): Promise<void>;
  onRemove(id: string): Promise<void>;
}

export default function Profiles({
  profiles,
  projects,
  initialEditId,
  onBack,
  onSave,
  onRemove,
}: Props) {
  const [editing, setEditing] = useState<GaugeProfile | null | undefined>(() =>
    initialEditId
      ? profiles.find((profile) => profile.id === initialEditId)
      : undefined,
  );
  const [error, setError] = useState('');
  const [pending, setPending] = useState<GaugeProfile | null>(null);
  if (editing !== undefined)
    return (
      <main className="page narrow">
        <ProfileWizard
          key={editing?.id ?? 'new'}
          initial={editing ?? undefined}
          onCancel={() => setEditing(undefined)}
          onSave={async (profile) => {
            await onSave(profile);
            setEditing(undefined);
          }}
        />
      </main>
    );
  return (
    <main className="page">
      <button className="quiet" onClick={onBack}>
        ← {initialEditId ? 'Editor' : 'Proyectos'}
      </button>
      <header className="page-heading">
        <div>
          <p className="eyebrow">LAS MEDIDAS DE TU TEJIDO</p>
          <h1>Mis muestras</h1>
          <p>
            Cada hilo y cada aguja dan medidas distintas. Calibra con tu propia
            muestra, sin báscula.
          </p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          Crear muestra
        </button>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!profiles.length && (
        <p>
          No tienes muestras todavía. Crea la primera para calcular el tamaño de
          tu tejido.
        </p>
      )}
      <ul className="project-list">
        {profiles.map((profile) => (
          <li key={profile.id}>
            <div className="project-info">
              <h2>{profile.name}</h2>
              <p>
                Aguja {new Intl.NumberFormat('es').format(profile.hookMm)} mm ·{' '}
                {profile.construction === 'flat' ? 'En plano' : 'En redondo'}
              </p>
              <p className="subtle">
                {profile.approximate
                  ? 'Aproximado: reemplaza estas medidas con una muestra tuya.'
                  : 'Medido con tu muestra'}
              </p>
            </div>
            <div className="profile-actions">
              <button
                onClick={() => {
                  setEditing(profile);
                  setError('');
                }}
              >
                Editar <span className="sr-only">{profile.name}</span>
              </button>
              <button
                onClick={() => {
                  void onSave({
                    ...profile,
                    id: createId(),
                    name: `${profile.name.slice(0, 112)} (copia)`,
                  }).catch(() => setError('No se pudo duplicar la muestra.'));
                }}
              >
                Duplicar <span className="sr-only">{profile.name}</span>
              </button>
              <button
                className="danger"
                onClick={() => {
                  const names = profileProjectNames(profile.id, projects);
                  if (names.length) {
                    setError(
                      `No puedes borrar esta muestra: la usan ${names.map((name) => `«${name}»`).join(', ')}. Cambia la muestra de esos proyectos primero.`,
                    );
                    return;
                  }
                  setError('');
                  setPending(profile);
                }}
              >
                Borrar <span className="sr-only">{profile.name}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      {pending && (
        <ConfirmDialog
          title="Borrar muestra"
          message={`¿Borrar «${pending.name}»? Ningún proyecto la usa.`}
          confirmLabel="Borrar muestra"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const id = pending.id;
            setPending(null);
            void onRemove(id).catch((reason: unknown) =>
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'No se pudo borrar la muestra.',
              ),
            );
          }}
        />
      )}
    </main>
  );
}
