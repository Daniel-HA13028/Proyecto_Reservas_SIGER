import { NavLink, useLocation } from 'react-router';
import { MENUS, opcionActiva } from '../../utils/menus';

// Navegación inferior en móvil y tableta (< 1024 px), con las cuatro opciones principales del rol.
export default function BarraInferior({ rol }) {
  const { pathname } = useLocation();
  return (
    <nav
      className="fixed bottom-0 left-0 z-40 flex w-full items-center justify-around rounded-t-xl border-t border-outline-variant bg-surface py-2 shadow-lg lg:hidden"
      aria-label="Menú principal"
    >
      {MENUS[rol].inferior.map((opcion) => {
        const activa = opcionActiva(opcion, pathname);
        return (
          <NavLink
            key={opcion.ruta}
            to={opcion.ruta}
            aria-current={activa ? 'page' : undefined}
            className={`flex flex-col items-center px-3 py-1 ${
              activa ? 'rounded-full bg-secondary-container text-white' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{opcion.icono}</span>
            <span className="text-[10px] font-semibold">{opcion.etiqueta}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
