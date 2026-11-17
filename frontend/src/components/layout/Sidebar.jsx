import { NavLink, useLocation } from 'react-router';
import Logo from '../Logo';
import { MENUS, opcionActiva } from '../../utils/menus';

// Menú lateral de escritorio (≥ 1024 px): fondo primario, 260 px, opción activa resaltada 
export default function Sidebar({ rol }) {
  const { pathname } = useLocation();
  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-sidebar shrink-0 flex-col gap-1 overflow-y-auto bg-primary p-4 lg:flex">
      <p className="px-4 pb-4 pt-2 text-[11px] font-semibold uppercase tracking-widest text-white/50">{rol}</p>
      <nav className="flex flex-col gap-1" aria-label="Menú principal">
        {MENUS[rol].lateral.map((opcion) => {
          const activa = opcionActiva(opcion, pathname);
          return (
            <NavLink
              key={opcion.ruta}
              to={opcion.ruta}
              aria-current={activa ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                activa ? 'bg-white/10 font-bold text-white' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{opcion.icono}</span>
              <span className="text-label-md">{opcion.etiqueta}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto px-4 pt-6 opacity-60">
        <Logo tono="claro" className="h-6" />
      </div>
    </aside>
  );
}
