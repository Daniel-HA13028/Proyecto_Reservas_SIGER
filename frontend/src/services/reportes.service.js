// Dashboards y reportes (RF-22 a RF-24, CU-08): contrato /api/v1/dashboard y /api/v1/reportes de T-01-02.
import api from './api';

const sinVacios = (filtros) => Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null));

export const dashboardService = {
  admin: () => api.get('/dashboard/admin').then((r) => r.data),
  organizador: () => api.get('/dashboard/organizador').then((r) => r.data),
  participante: () => api.get('/dashboard/participante').then((r) => r.data),
};

export const reportesService = {
  generar: (filtros) => api.get('/reportes', { params: sinVacios(filtros) }).then((r) => r.data),
  /** Descarga el PDF o XLSX con el nombre que propone el servidor. */
  exportar: async (formato, filtros) => {
    const r = await api.get('/reportes/exportar', { params: sinVacios({ ...filtros, formato }), responseType: 'blob', headers: { Accept: '*/*' } });
    const nombre = /filename="?([^";]+)"?/.exec(r.headers['content-disposition'] ?? '')?.[1] ?? `reporte.${formato}`;
    const url = URL.createObjectURL(r.data);
    Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
