import { forwardRef, useId } from 'react';

// Campo con etiqueta, ícono opcional, ayuda y error accesibles (T-01-06).
const Input = forwardRef(function Input({ etiqueta, icono, error, ayuda, className = '', derecha, ...props }, ref) {
  const id = useId();
  const descripcion = error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
  return (
    <div className={`space-y-2 ${className}`}>
      {etiqueta && (
        <label htmlFor={id} className="ml-1 block text-label-md uppercase text-on-surface-variant">
          {etiqueta}
        </label>
      )}
      <div className="relative">
        {icono && (
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" aria-hidden="true">
            {icono}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descripcion}
          className={`w-full rounded-lg border bg-surface py-3 text-body-base outline-none transition-all focus:border-secondary focus:ring-2 focus:ring-secondary/20 ${icono ? 'pl-10' : 'pl-4'} ${derecha ? 'pr-12' : 'pr-4'} ${error ? 'border-error' : 'border-outline-variant'}`}
          {...props}
        />
        {derecha && <div className="absolute right-3 top-1/2 -translate-y-1/2">{derecha}</div>}
      </div>
      {error ? (
        <p id={`${id}-error`} className="ml-1 flex items-center gap-1 text-body-sm text-error">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
            error
          </span>
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className="ml-1 text-body-sm text-on-surface-variant">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
});

export default Input;
