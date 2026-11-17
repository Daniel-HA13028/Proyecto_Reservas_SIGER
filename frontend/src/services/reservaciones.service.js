// Reservaciones y comprobante (RF-13 a RF-16): contrato /api/v1/eventos/{id}/reservaciones y /api/v1/reservaciones de T-01-02.
import api from './api';

export const reservacionesService = {
  reservar: (idEvento, datos) => api.post(`/eventos/${idEvento}/reservaciones`, datos).then((r) => r.data),
  mias: (grupo, pagina = 1, limite = 10) => api.get('/reservaciones/mias', { params: { grupo, pagina, limite } }).then((r) => r.data),
  detalle: (id) => api.get(`/reservaciones/${id}`).then((r) => r.data),
  /** El QR exige el token, así que se pide como Blob y se muestra con una URL local (URL.createObjectURL). */
  qr: (id) => api.get(`/reservaciones/${id}/qr`, { responseType: 'blob', headers: { Accept: 'image/png, application/json' } }).then((r) => r.data),
  cancelar: (id) => api.patch(`/reservaciones/${id}/cancelar`).then((r) => r.data),
};
