// Paginación (T-01-06). Las páginas empiezan en 1, igual que la API.
export default function Pagination({ pagina, totalPaginas, totalElementos, onCambiar }) {
  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Paginación">
      <p className="text-body-sm text-on-surface-variant">
        {totalPaginas > 1 ? `Página ${pagina} de ${totalPaginas} · ` : ''}
        {totalElementos} resultado{totalElementos === 1 ? '' : 's'}
      </p>
      {totalPaginas > 1 && (
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-outline-variant p-2 hover:bg-surface-container-low disabled:opacity-40"
            disabled={pagina <= 1}
            onClick={() => onCambiar(pagina - 1)}
            aria-label="Página anterior"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
          <button
            type="button"
            className="rounded-lg border border-outline-variant p-2 hover:bg-surface-container-low disabled:opacity-40"
            disabled={pagina >= totalPaginas}
            onClick={() => onCambiar(pagina + 1)}
            aria-label="Página siguiente"
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      )}
    </nav>
  );
}
