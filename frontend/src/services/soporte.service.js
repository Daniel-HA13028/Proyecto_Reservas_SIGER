// Soporte técnico (RF-25, CU-15): contrato /api/v1/soporte/tickets de T-01-02.
import api from './api';

const sinVacios = (filtros) => Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== '' && v != null));

export const soporteService = {
  crear: (datos) => api.post('/soporte/tickets', datos).then((r) => r.data),
  listar: (filtros) => api.get('/soporte/tickets', { params: sinVacios(filtros) }).then((r) => r.data),
  cambiarEstado: (id, estado) => api.patch(`/soporte/tickets/${id}/estado`, { estado }).then((r) => r.data),
  // Envía la respuesta por correo (plantilla «Equipo Soporte SIGER») y deja la solicitud En proceso, o Cerrada si cerrar.
  responder: (id, mensaje, cerrar) => api.post(`/soporte/tickets/${id}/respuestas`, { mensaje, cerrar }).then((r) => r.data),
};

export const TIPOS_SOPORTE = [
  { valor: 'Incidente', texto: 'Algo no funciona' },
  { valor: 'Acceso', texto: 'Problema para entrar a mi cuenta' },
  { valor: 'Consulta', texto: 'Tengo una pregunta' },
  { valor: 'Solicitud_Cambio', texto: 'Propuesta de mejora' },
];
