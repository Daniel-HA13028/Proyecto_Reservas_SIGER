import { useId } from 'react';

// Lista desplegable con etiqueta. opciones: [{ valor, texto }].
export default function Select({ etiqueta, opciones, error, className = '', ...props }) {
  const id = useId();
  return (
    <div className={`space-y-2 ${className}`}>
      {etiqueta && (
        <label htmlFor={id} className="ml-1 block text-label-md uppercase text-on-surface-variant">
          {etiqueta}
        </label>
      )}
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border bg-surface px-4 py-3 text-body-base outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 ${error ? 'border-error' : 'border-outline-variant'}`}
        {...props}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {error && <p className="ml-1 text-body-sm text-error">{error}</p>}
    </div>
  );
}
