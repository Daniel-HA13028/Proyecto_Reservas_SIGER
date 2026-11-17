// Formatos de fecha, hora y precio en español de El Salvador. Las fechas de la API vienen en ISO con zona horaria.
const ZONA = 'America/El_Salvador';

export const fechaLarga = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-SV', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

export const fechaCorta = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-SV', { timeZone: ZONA, day: '2-digit', month: 'short', year: 'numeric' }) : '';

export const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-SV', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' }) : '');

export const fechaHora = (iso) => (iso ? `${fechaCorta(iso)} · ${hora(iso)}` : '');

/** RN-12: precio 0 = Gratis; si no, dólares con dos decimales. */
export const precio = (valor) => (Number(valor) === 0 ? 'Gratis' : `US$ ${Number(valor).toFixed(2)}`);

/**
 * El formulario usa <input type="datetime-local"> (hora local, sin zona). Al enviar se agrega el desfase de
 * El Salvador (-06:00, sin horario de verano) para que la API reciba el instante correcto.
 */
export const DESFASE = '-06:00';

export function aInputLocal(iso) {
  if (!iso) return '';
  const partes = new Intl.DateTimeFormat('sv-SE', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(iso));
  return partes.replace(' ', 'T');
}

export function deInputLocal(valor) {
  return valor ? `${valor}:00${DESFASE}` : null;
}

/** Disponibilidad para tarjetas y detalle (RN-01). */
export function disponibilidad(evento) {
  if (evento.estadoEvento === 'Cancelado') return { texto: 'Cancelado', tono: 'error' };
  if (evento.estadoEvento === 'Finalizado') return { texto: 'Finalizado', tono: 'neutro' };
  if (evento.lleno) return { texto: 'Lleno', tono: 'error' };
  if (evento.cupoDisponible <= Math.max(3, evento.cupoMaximo * 0.1)) return { texto: 'Últimos cupos', tono: 'advertencia' };
  return { texto: 'Disponible', tono: 'exito' };
}
