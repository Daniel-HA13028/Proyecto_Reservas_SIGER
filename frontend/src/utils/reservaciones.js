// Reglas de las reservaciones que la interfaz explica al participante (RN-07).
import { fechaHora } from './formato';

export const HORAS_CANCELACION = 24;

/** Por qué una reservación no se puede cancelar; el backend decide con el mismo plazo (campo «cancelable»). */
export function motivoNoCancelable(reservacion) {
  if (reservacion.estadoReservacion === 'Cancelada') return 'La reservación ya está cancelada.';
  const inicio = new Date(reservacion.evento.fechaHoraInicio);
  if (inicio <= new Date()) return 'El evento ya comenzó.';
  const limite = new Date(inicio.getTime() - HORAS_CANCELACION * 3600 * 1000);
  return `Solo se puede cancelar hasta ${HORAS_CANCELACION} horas antes del inicio (hasta el ${fechaHora(limite.toISOString())}).`;
}
