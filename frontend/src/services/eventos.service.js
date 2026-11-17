// Eventos y categorías (RF-08 a RF-12, RF-26): contrato /api/v1/eventos y /api/v1/categorias de T-01-02.
import api from './api';

const sinVacios = (filtros) => Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null));

/** El contrato recibe multipart: la parte «datos» en JSON y la parte opcional «imagen». */
function formulario(datos, imagen) {
  const fd = new FormData();
  fd.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
  if (imagen) fd.append('imagen', imagen);
  return fd;
}

export const eventosService = {
  catalogo: (filtros) => api.get('/eventos', { params: sinVacios(filtros) }).then((r) => r.data),
  detalle: (id) => api.get(`/eventos/${id}`).then((r) => r.data),
  mios: (filtros) => api.get('/eventos/mios', { params: sinVacios(filtros) }).then((r) => r.data),
  crear: (datos, imagen) => api.post('/eventos', formulario(datos, imagen)).then((r) => r.data),
  actualizar: (id, datos, imagen) => api.put(`/eventos/${id}`, formulario(datos, imagen)).then((r) => r.data),
  publicar: (id) => api.patch(`/eventos/${id}/publicar`).then((r) => r.data),
  cancelar: (id, motivo) => api.patch(`/eventos/${id}/cancelar`, { motivo }).then((r) => r.data),
  eliminar: (id) => api.delete(`/eventos/${id}`),
};

export const categoriasService = {
  listar: (todas = false) => api.get('/categorias', { params: todas ? { todas: true } : {} }).then((r) => r.data),
  crear: (nombre) => api.post('/categorias', { nombre }).then((r) => r.data),
  renombrar: (id, nombre) => api.put(`/categorias/${id}`, { nombre }).then((r) => r.data),
  cambiarEstado: (id, activa) => api.patch(`/categorias/${id}/estado`, { activa }).then((r) => r.data),
};
