import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rutaInicio } from '../../services/sesion';
import Logo from '../Logo';

const enlace = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-body-sm font-semibold ${isActive ? 'text-secondary' : 'text-on-surface-variant hover:text-primary'}`;

// Plantilla de las pantallas públicas: Eventos, Ayuda, Iniciar sesión y Registrarse. Con sesión, en lugar de
// iniciar sesión y registrarse muestra el acceso a su panel 
export default function PublicLayout() {
  const { usuario } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:px-margin-desktop">
        <Link to="/" aria-label="SIGER, ir al inicio">
          <Logo className="h-8" />
        </Link>
        <nav className="flex items-center gap-1" aria-label="Menú público">
          <NavLink to="/eventos" className={enlace}>
            Eventos
          </NavLink>
          <NavLink to="/ayuda/faq" className={(e) => `${enlace(e)} hidden sm:block`}>
            Ayuda
          </NavLink>
          {usuario ? (
            <Link to={rutaInicio(usuario.rol)} className="ml-1 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary-container">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">dashboard</span>
              Mi panel
            </Link>
          ) : (
            <>
              <NavLink to="/login" className={enlace}>
                Iniciar sesión
              </NavLink>
              <Link to="/registro" className="ml-1 hidden rounded-lg bg-primary px-4 py-2 text-body-sm font-semibold text-on-primary hover:bg-primary-container sm:block">
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-container-max-width flex-1 px-margin-mobile py-6 md:px-margin-desktop">
        <Outlet />
      </main>
      <footer className="border-t border-outline-variant px-margin-mobile py-4 text-center text-body-sm text-on-surface-variant md:px-margin-desktop">
        SIGER · Sistema Inteligente de Gestión de Eventos y Reservaciones
      </footer>
    </div>
  );
}
