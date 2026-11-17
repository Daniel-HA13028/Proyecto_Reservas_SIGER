// Menús por rol (T-01-04, sección 3). Íconos de Material Symbols, los mismos de los prototipos.
export const ROLES = {
  PARTICIPANTE: 'Participante',
  ORGANIZADOR: 'Organizador',
  ADMINISTRADOR: 'Administrador',
};

export const MENUS = {
  [ROLES.PARTICIPANTE]: {
    lateral: [
      { ruta: '/inicio', etiqueta: 'Inicio', icono: 'home' },
      { ruta: '/eventos', etiqueta: 'Explorar eventos', icono: 'search' },
      { ruta: '/mis-reservaciones', etiqueta: 'Mis reservaciones', icono: 'confirmation_number' },
      { ruta: '/ayuda/faq', etiqueta: 'Ayuda', icono: 'help' },
    ],
    inferior: [
      { ruta: '/inicio', etiqueta: 'Inicio', icono: 'home' },
      { ruta: '/eventos', etiqueta: 'Explorar', icono: 'search' },
      { ruta: '/mis-reservaciones', etiqueta: 'Reservas', icono: 'confirmation_number' },
      { ruta: '/perfil', etiqueta: 'Perfil', icono: 'person' },
    ],
  },
  [ROLES.ORGANIZADOR]: {
    lateral: [
      { ruta: '/organizador', etiqueta: 'Inicio', icono: 'dashboard', exacta: true },
      { ruta: '/organizador/eventos', etiqueta: 'Mis eventos', icono: 'event', excluir: ['/organizador/eventos/nuevo'] },
      { ruta: '/organizador/eventos/nuevo', etiqueta: 'Crear evento', icono: 'add_circle' },
      { ruta: '/reportes', etiqueta: 'Reportes', icono: 'analytics' },
      { ruta: '/ayuda/faq', etiqueta: 'Ayuda', icono: 'help' },
    ],
    inferior: [
      { ruta: '/organizador', etiqueta: 'Inicio', icono: 'dashboard', exacta: true },
      { ruta: '/organizador/eventos', etiqueta: 'Eventos', icono: 'event', excluir: ['/organizador/eventos/nuevo'] },
      { ruta: '/organizador/eventos/nuevo', etiqueta: 'Crear', icono: 'add_circle' },
      { ruta: '/reportes', etiqueta: 'Reportes', icono: 'analytics' },
    ],
  },
  [ROLES.ADMINISTRADOR]: {
    lateral: [
      { ruta: '/admin', etiqueta: 'Inicio', icono: 'dashboard', exacta: true },
      { ruta: '/admin/usuarios', etiqueta: 'Usuarios', icono: 'group' },
      { ruta: '/admin/eventos', etiqueta: 'Eventos', icono: 'event' },
      { ruta: '/admin/categorias', etiqueta: 'Categorías', icono: 'category' },
      { ruta: '/reportes', etiqueta: 'Reportes', icono: 'analytics' },
      { ruta: '/admin/soporte', etiqueta: 'Soporte', icono: 'support_agent' },
    ],
    inferior: [
      { ruta: '/admin', etiqueta: 'Inicio', icono: 'dashboard', exacta: true },
      { ruta: '/admin/usuarios', etiqueta: 'Usuarios', icono: 'group' },
      { ruta: '/admin/eventos', etiqueta: 'Eventos', icono: 'event' },
      { ruta: '/reportes', etiqueta: 'Reportes', icono: 'analytics' },
    ],
  },
};

/** Indica si una opción del menú corresponde a la ruta actual. */
export function opcionActiva(opcion, rutaActual) {
  if (opcion.exacta) return rutaActual === opcion.ruta;
  if (opcion.excluir?.some((r) => rutaActual.startsWith(r))) return false;
  return rutaActual === opcion.ruta || rutaActual.startsWith(`${opcion.ruta}/`);
}
