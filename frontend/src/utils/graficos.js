// Colores y formatos de los gráficos (Recharts), tomados de la paleta de tailwind.config.js.
export const COLORES = {
  primario: '#00236f',
  secundario: '#0058be',
  secundarioClaro: '#2170e4',
  exito: '#15803d',
  error: '#ba1a1a',
  rejilla: '#c5c5d3',
  texto: '#444651',
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** «2026-09» → «sept 2026»; «2026-09-14» → «14 sept». */
export function etiquetaPeriodo(etiqueta) {
  const [a, m, d] = etiqueta.split('-');
  return d ? `${Number(d)} ${MESES[Number(m) - 1]}` : `${MESES[Number(m) - 1]} ${a}`;
}

/** Acciones de la bitácora en palabras (actividad reciente del administrador). */
export const ACCIONES = {
  LOGIN: 'inició sesión',
  CAMBIO_ROL: 'cambió un rol',
  CAMBIO_ESTADO: 'cambió el estado de una cuenta',
  CAMBIO_CONTRASENA: 'cambió su contraseña',
  CAMBIO_CORREO: 'cambió su correo',
  CREAR_USUARIO: 'creó un usuario',
  EDITAR_USUARIO: 'editó un usuario',
  APROBAR_ORGANIZADOR: 'aprobó a un organizador',
  RECHAZAR_ORGANIZADOR: 'rechazó a un organizador',
  EXPORTAR_USUARIOS: 'exportó la lista de usuarios',
  CREAR_EVENTO: 'creó un evento',
  EDITAR_EVENTO: 'editó un evento',
  PUBLICAR_EVENTO: 'publicó un evento',
  ELIMINAR_EVENTO: 'eliminó un evento',
  CANCELAR_EVENTO: 'canceló un evento',
  MARCAR_ASISTENCIA: 'marcó una asistencia',
  DESHACER_ASISTENCIA: 'deshizo una asistencia',
  EXPORTAR_PARTICIPANTES: 'exportó participantes',
  EXPORTAR_REPORTE: 'exportó un reporte',
};
