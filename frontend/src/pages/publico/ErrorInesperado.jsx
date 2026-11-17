import { Link, useRouteError } from 'react-router';

/** Fallo al descargar una página diferida: suele pasar cuando se publicó una versión nueva con la aplicación abierta. */
const esVersionNueva = (error) => /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(error?.message ?? error));

// Error inesperado en una pantalla (T-10-06): reemplaza la página técnica de React Router por una explicación y la opción
// de recargar. El detalle queda en la consola para quien depura.
export default function ErrorInesperado() {
  const error = useRouteError();
  const nueva = esVersionNueva(error);
  console.error(error);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="mx-auto flex max-w-lg flex-col items-center py-12 text-center" aria-labelledby="titulo-error">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container">
          <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">{nueva ? 'system_update' : 'error'}</span>
        </div>
        <h1 id="titulo-error" className="mb-3 text-headline-md text-primary">
          {nueva ? 'Hay una versión nueva de SIGER' : 'Algo salió mal'}
        </h1>
        <p className="mb-8 text-body-base text-on-surface-variant">
          {nueva
            ? 'No pudimos cargar esta pantalla porque la aplicación se actualizó. Recarga la página para continuar.'
            : 'Ocurrió un error inesperado al mostrar esta pantalla. Recarga la página; si se repite, repórtalo a soporte.'}
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-container">
            Recargar la página
          </button>
          <Link to="/ayuda/soporte" className="rounded-lg border border-outline-variant px-6 py-3 font-semibold hover:bg-surface-container-low">
            Reportar a soporte
          </Link>
        </div>
      </section>
    </main>
  );
}
