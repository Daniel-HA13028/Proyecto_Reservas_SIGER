// Gestión de usuarios del Administrador (RF-05, RF-06): contrato /api/v1/usuarios de T-01-02.
import api from './api';

const sinVacios = (filtros) => Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null));

export const usuariosService = {
  listar: (filtros) => api.get('/usuarios', { params: sinVacios(filtros) }).then((r) => r.data),
  crear: (datos) => api.post('/usuarios', datos).then((r) => r.data),
  actualizar: (id, datos) => api.put(`/usuarios/${id}`, datos).then((r) => r.data),
  cambiarEstado: (id, estado) => api.patch(`/usuarios/${id}/estado`, { estado }).then((r) => r.data),
  cambiarRol: (id, rol) => api.patch(`/usuarios/${id}/rol`, { rol }).then((r) => r.data),
  resolverAprobacion: (id, aprobar, motivo) => api.patch(`/usuarios/${id}/aprobacion`, { aprobar, motivo }).then((r) => r.data),

  /** Descarga el PDF o Excel con el nombre que indica el servidor (Content-Disposition). */
  async exportar(formato, filtros) {
    const r = await api.get('/usuarios/exportar', { params: sinVacios({ formato, ...filtros }), responseType: 'blob' });
    const nombre = /filename="?([^";]+)"?/.exec(r.headers['content-disposition'] ?? '')?.[1] ?? `usuarios.${formato}`;
    const url = URL.createObjectURL(r.data);
    const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  },
};
