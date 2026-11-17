// Control de asistencia (RF-17 a RF-19): contrato /api/v1/eventos/{id}/participantes y /asistencias de T-01-02.
import api from './api';

const sinVacios = (filtros) => Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null));

export const asistenciaService = {
  participantes: (idEvento, filtros) => api.get(`/eventos/${idEvento}/participantes`, { params: sinVacios(filtros) }).then((r) => r.data),
  /** Descarga el PDF o XLSX con el nombre que propone el servidor. */
  exportar: async (idEvento, formato, filtros) => {
    const r = await api.get(`/eventos/${idEvento}/participantes/exportar`, {
      params: sinVacios({ ...filtros, formato }),
      responseType: 'blob',
      headers: { Accept: '*/*' },
    });
    const nombre = /filename="?([^";]+)"?/.exec(r.headers['content-disposition'] ?? '')?.[1] ?? `participantes.${formato}`;
    const url = URL.createObjectURL(r.data);
    Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  validarQr: (idEvento, codigo, metodo = 'QR_Scanner') => api.post(`/eventos/${idEvento}/asistencias/qr`, { codigo, metodo }).then((r) => r.data),
  marcar: (idEvento, idReservacion) => api.post(`/eventos/${idEvento}/asistencias`, { idReservacion }).then((r) => r.data),
  deshacer: (idEvento, idReservacion) => api.delete(`/eventos/${idEvento}/asistencias/${idReservacion}`),
  resumen: (idEvento) => api.get(`/eventos/${idEvento}/asistencias/resumen`).then((r) => r.data),
};
