// Centro de notificaciones (RF-21, CU-14): contrato /api/v1/notificaciones de T-01-02.
import api from './api';

/** Evento del navegador para que la campana actualice su contador al marcar avisos como leídos. */
export const NOTIFICACIONES_CAMBIARON = 'siger:notificaciones';
export const avisarCambio = () => window.dispatchEvent(new Event(NOTIFICACIONES_CAMBIARON));

export const notificacionesService = {
  listar: ({ leida, pagina = 1, limite = 10 } = {}) =>
    api.get('/notificaciones', { params: { pagina, limite, ...(leida == null ? {} : { leida }) } }).then((r) => r.data),
  marcarLeida: (id) => api.patch(`/notificaciones/${id}/leida`).then(avisarCambio),
  marcarTodas: () => api.patch('/notificaciones/leidas').then(avisarCambio),
};
