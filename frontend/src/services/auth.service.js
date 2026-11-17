// Autenticación (RF-01 a RF-04): contrato /api/v1/auth de T-01-02.
import api from './api';

export const authService = {
  login: (correoElectronico, contrasena, recordarme) =>
    api.post('/auth/login', { correoElectronico, contrasena, recordarme }).then((r) => r.data),
  registro: (datos) => api.post('/auth/registro', datos).then((r) => r.data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  verificarCorreo: (token) => api.post('/auth/verificar-correo', { token }),
  reenviarVerificacion: (correoElectronico) => api.post('/auth/reenviar-verificacion', { correoElectronico }),
  recuperar: (correoElectronico) => api.post('/auth/recuperar', { correoElectronico }),
  verificarCodigo: (correoElectronico, codigo) => api.post('/auth/verificar-codigo', { correoElectronico, codigo }),
  restablecer: (datos) => api.post('/auth/restablecer', datos),
};

export const perfilService = {
  obtener: () => api.get('/perfil').then((r) => r.data),
  actualizar: (datos) => api.put('/perfil', datos).then((r) => r.data),
  cambiarContrasena: (datos) => api.put('/perfil/contrasena', datos),
};
