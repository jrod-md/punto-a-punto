import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export default function EditorPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
}) {
  const box = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <div
      className="panel-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={box}
        className="editor-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Tab') {
            const elements = [
              ...(box.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input, select, summary',
              ) ?? []),
            ].filter((element) => element.getClientRects().length > 0);
            const first = elements[0];
            const last = elements.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="panel-heading">
          <h2 id="panel-title">{title}</h2>
          <button ref={close} onClick={onClose}>
            Cerrar
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
