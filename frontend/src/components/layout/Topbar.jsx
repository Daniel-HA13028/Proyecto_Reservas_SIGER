import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import Logo from '../Logo';

// Barra superior con sesión : logotipo, campana de notificaciones y menú del usuario.
// El contador de no leídas lo mantiene AppLayout con GET /notificaciones
export default function Topbar({ nombre, rol, noLeidas = 0, onCerrarSesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');

  useEffect(() => {
    if (!menuAbierto) return undefined;
    const cerrarFuera = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuAbierto(false);
    const cerrarConEsc = (e) => e.key === 'Escape' && setMenuAbierto(false);
    document.addEventListener('mousedown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEsc);
    return () => {
      document.removeEventListener('mousedown', cerrarFuera);
      document.removeEventListener('keydown', cerrarConEsc);
    };
  }, [menuAbierto]);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-margin-mobile md:px-margin-desktop">
      <Link to="/" aria-label="SIGER, ir al inicio">
        <Logo className="h-8" />
      </Link>
      <div className="relative flex items-center gap-2" ref={menuRef}>
        <Link
          to="/notificaciones"
          className="relative rounded-full p-2 hover:bg-surface-container-low"
        >
          {/* Nombre accesible desde el contenido (WCAG 2.5.3): el ícono y la insignia son decorativos. */}
          <span className="sr-only">{noLeidas > 0 ? `Notificaciones (${noLeidas} sin leer)` : 'Notificaciones'}</span>
          <span className="material-symbols-outlined text-on-surface-variant" aria-hidden="true">notifications</span>
          {noLeidas > 0 && (
            <span aria-hidden="true" className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
              {noLeidas > 99 ? '99+' : noLeidas}
            </span>
          )}
        </Link>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pl-2 pr-1 hover:bg-surface-container-low"
          aria-haspopup="menu"
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container text-sm font-bold text-white">
            {iniciales}
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-body-sm font-semibold">{nombre}</span>
            <span className="block text-[11px] text-on-surface-variant">{rol}</span>
          </span>
          <span className="material-symbols-outlined hidden text-on-surface-variant md:block" aria-hidden="true">expand_more</span>
        </button>
        {menuAbierto && (
          <div
            role="menu"
            className="absolute right-0 top-14 w-48 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest py-1 shadow-modal"
          >
            <Link
              role="menuitem"
              to="/perfil"
              className="flex items-center gap-3 px-4 py-2 text-body-sm hover:bg-surface-container-low"
              onClick={() => setMenuAbierto(false)}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person</span>Mi perfil
            </Link>
            <button
              role="menuitem"
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-body-sm text-error hover:bg-error-container/40"
              onClick={() => {
                setMenuAbierto(false);
                onCerrarSesion?.();
              }}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
