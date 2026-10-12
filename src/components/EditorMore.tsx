import { EditorActionIcon, PictureIcon } from './Art';
import EditorPanel from './EditorPanel';

export default function EditorMore({
  mirror,
  onClose,
  onAction,
}: {
  mirror: boolean;
  onClose(): void;
  onAction(action: 'center' | 'mirror' | 'text' | 'image'): void;
}) {
  return (
    <EditorPanel sheet title="Más herramientas" onClose={onClose}>
      <div className="sheet-actions">
        <button onClick={() => onAction('center')}>
          <EditorActionIcon name="center" />
          <span>Centrar el diseño</span>
        </button>
        <button aria-pressed={mirror} onClick={() => onAction('mirror')}>
          <EditorActionIcon name="mirror" />
          <span>
            Espejo <small>{mirror ? 'Encendido' : 'Apagado'}</small>
          </span>
        </button>
        <button onClick={() => onAction('text')}>
          <EditorActionIcon name="text" />
          <span>Escribir texto</span>
        </button>
        <button onClick={() => onAction('image')}>
          <PictureIcon />
          <span>Añadir una imagen</span>
        </button>
      </div>
    </EditorPanel>
  );
}
