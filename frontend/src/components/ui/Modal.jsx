import { useEffect, useRef } from 'react';

// Ventana modal accesible (T-01-06): enfoca el diálogo y se cierra con Escape o al hacer clic en el fondo.
export default function Modal({ abierto, titulo, onCerrar, children, acciones }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    ref.current?.focus();
    const conEsc = (e) => e.key === 'Escape' && onCerrar?.();
    document.addEventListener('keydown', conEsc);
    return () => document.removeEventListener('keydown', conEsc);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar?.()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl bg-surface-container-lowest p-6 shadow-modal outline-none"
      >
        <h2 id="modal-titulo" className="mb-3 text-title-sm text-on-surface">
          {titulo}
        </h2>
        <div className="text-body-base text-on-surface-variant">{children}</div>
        {acciones && <div className="mt-6 flex flex-wrap justify-end gap-3">{acciones}</div>}
      </div>
    </div>
  );
}
