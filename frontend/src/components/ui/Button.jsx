// Botón común (T-01-06). variante: primario | secundario | contorno | peligro | texto.
const VARIANTES = {
  primario: 'bg-primary text-on-primary hover:bg-primary-container',
  secundario: 'bg-secondary text-on-secondary hover:bg-secondary-container',
  contorno: 'border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container-low',
  peligro: 'bg-error text-on-error hover:opacity-90',
  texto: 'text-secondary hover:bg-secondary/10',
};

export default function Button({ variante = 'primario', cargando = false, icono, className = '', children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || cargando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
      {...props}
    >
      {cargando ? (
        <span className="material-symbols-outlined animate-spin text-[20px]" aria-hidden="true">
          progress_activity
        </span>
      ) : (
        icono && (
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            {icono}
          </span>
        )
      )}
      {children}
    </button>
  );
}
