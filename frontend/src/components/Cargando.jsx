// Indicador de carga a pantalla completa (mientras se recupera la sesión).
export default function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-on-surface-variant" role="status">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary" aria-hidden="true">
        progress_activity
      </span>
      <p className="text-body-sm">{texto}</p>
    </div>
  );
}
