// Dónde vive la sesión en el navegador (T-04-10):
// - El access token (30 min) solo en memoria: no queda en el almacenamiento si alguien inyecta código en la página.
// - El refresh token y los datos del usuario en localStorage si se marcó «Recordarme», o en sessionStorage
//   (se borra al cerrar la pestaña) si no.
const CLAVE = 'siger.sesion';
let accessToken = null;

function leer(almacen) {
  try {
    const valor = almacen.getItem(CLAVE);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

export function sesionGuardada() {
  return leer(localStorage) ?? leer(sessionStorage);
}

export function guardarSesion({ accessToken: acceso, refreshToken, usuario }, recordarme) {
  accessToken = acceso;
  const datos = JSON.stringify({ refreshToken, usuario, recordarme });
  try {
    (recordarme ? localStorage : sessionStorage).setItem(CLAVE, datos);
    (recordarme ? sessionStorage : localStorage).removeItem(CLAVE);
  } catch {
    // Almacenamiento bloqueado: la sesión dura mientras la página esté abierta.
  }
}

/** Tras renovar: nuevo access token, refresh rotado y usuario actualizado, en el mismo almacén. */
export function actualizarSesion(respuesta) {
  guardarSesion(respuesta, sesionGuardada()?.recordarme ?? false);
}

export function actualizarUsuario(usuario) {
  const actual = sesionGuardada();
  if (actual) guardarSesion({ accessToken, refreshToken: actual.refreshToken, usuario }, actual.recordarme);
}

export function borrarSesion() {
  accessToken = null;
  try {
    localStorage.removeItem(CLAVE);
    sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que borrar
  }
}

export function obtenerAccessToken() {
  return accessToken;
}

/** Ruta de inicio según el rol, usada al iniciar sesión (T-04-10). */
export function rutaInicio(rol) {
  return { Administrador: '/admin', Organizador: '/organizador', Participante: '/inicio' }[rol] ?? '/eventos';
}
