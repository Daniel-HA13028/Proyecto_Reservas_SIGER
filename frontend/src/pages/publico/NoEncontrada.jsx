import { Link, useNavigate } from 'react-router';

// Página 404 (prototipo siger_error_404, T-01-04).
export default function NoEncontrada() {
  const navigate = useNavigate();
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center py-12 text-center" aria-labelledby="titulo-404">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container">
        <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">travel_explore</span>
      </div>
      <p className="mb-2 text-label-md tracking-widest text-secondary">ERROR 404</p>
      <h1 id="titulo-404" className="mb-3 text-display-lg-mobile text-primary md:text-display-lg">
        No encontramos esta página
      </h1>
      <p className="mb-8 text-body-base text-on-surface-variant">
        La dirección no existe o el evento ya no está disponible. Revisa el enlace o vuelve al catálogo de eventos.
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/eventos" className="rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-container">
          Ver eventos
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-outline-variant px-6 py-3 font-semibold hover:bg-surface-container-low"
        >
          Volver atrás
        </button>
      </div>
    </section>
  );
}
