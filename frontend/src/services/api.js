// Cliente HTTP de la API REST de SIGER. Todos los servicios (auth.service.js, usuarios.service.js…) lo usan.
import axios from 'axios';
import { mensajeDeError } from '../utils/mensajesError';
import { actualizarSesion, borrarSesion, obtenerAccessToken, sesionGuardada } from './sesion';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

// Adjunta el access token a cada petición (T-04-10).
api.interceptors.request.use((config) => {
  const token = obtenerAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Una sola renovación a la vez: si varias peticiones reciben 401 juntas, todas esperan el mismo refresh.
let renovando = null;

/** Pide tokens nuevos con el refresh token guardado. Devuelve la respuesta o null si la sesión ya no sirve. */
export function renovarSesion() {
  const refreshToken = sesionGuardada()?.refreshToken;
  if (!refreshToken) return Promise.resolve(null);
  renovando ??= axios
    .post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }, { timeout: 15000 })
    .then(({ data }) => {
      actualizarSesion(data);
      return data;
    })
    .catch(() => {
      borrarSesion();
      window.dispatchEvent(new Event('siger:sesion-cerrada'));
      return null;
    })
    .finally(() => {
      renovando = null;
    });
  return renovando;
}

const RENOVABLES = new Set(['SESION_EXPIRADA', 'NO_AUTENTICADO']);

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const original = error.config;
    const codigo = error.response?.data?.error?.codigo;
    const esAuth = original?.url?.startsWith('/auth/') && original.url !== '/auth/logout';
    // Access token vencido: se renueva una vez y se repite la petición.
    if (error.response?.status === 401 && RENOVABLES.has(codigo) && original && !original._reintentada && !esAuth) {
      original._reintentada = true;
      const sesion = await renovarSesion();
      if (sesion) {
        original.headers.Authorization = `Bearer ${sesion.accessToken}`;
        return api(original);
      }
    } else if (error.response?.status === 401 && codigo === 'SESION_NO_VALIDA' && !esAuth) {
      borrarSesion();
      window.dispatchEvent(new Event('siger:sesion-cerrada'));
    }
    // Cada error lleva el código del catálogo (T-01-07) y el mensaje listo para mostrar.
    error.codigo = codigo ?? (error.response ? 'ERROR_INTERNO' : 'SIN_CONEXION');
    error.mensaje = mensajeDeError(error);
    error.detalles = error.response?.data?.error?.detalles ?? [];
    return Promise.reject(error);
  },
);

export default api;
