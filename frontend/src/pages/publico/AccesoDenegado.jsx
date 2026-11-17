import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rutaInicio } from '../../services/sesion';

// Página 403 (prototipo siger_error_403, T-01-04): el rol no tiene acceso a esta sección.
export default function AccesoDenegado() {
  const { usuario } = useAuth();
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center py-12 text-center" aria-labelledby="titulo-403">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-error-container">
        <span className="material-symbols-outlined text-5xl text-error" aria-hidden="true">
          lock
        </span>
      </div>
      <p className="mb-2 text-label-md tracking-widest text-error">ERROR 403</p>
      <h1 id="titulo-403" className="mb-3 text-display-lg-mobile text-primary md:text-display-lg">
        No tienes acceso a esta sección
      </h1>
      <p className="mb-8 text-body-base text-on-surface-variant">
        Tu rol no tiene permiso para ver esta página. Si crees que es un error, comunícate con un administrador.
      </p>
      <Link to={rutaInicio(usuario?.rol)} className="rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-container">
        Ir a mi inicio
      </Link>
    </section>
  );
}
