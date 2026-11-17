// Validaciones del lado del cliente: las mismas reglas que el backend (Validaciones.java), para avisar antes de enviar.

/** RNF-01: 8 a 72 caracteres con mayúscula, minúscula, número y símbolo. */
export const REQUISITOS_CONTRASENA = [
  ['8 caracteres o más', (v) => v.length >= 8],
  ['Una mayúscula', (v) => /[A-Z]/.test(v)],
  ['Una minúscula', (v) => /[a-z]/.test(v)],
  ['Un número', (v) => /\d/.test(v)],
  ['Un símbolo', (v) => /[^A-Za-z\d]/.test(v)],
];

export function contrasenaValida(valor) {
  return valor.length <= 72 && REQUISITOS_CONTRASENA.every(([, prueba]) => prueba(valor));
}

export function correoValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

/** Convierte los detalles de un 422 de la API en { campo: mensaje } para mostrarlos junto a cada campo. */
export function erroresPorCampo(error) {
  return Object.fromEntries((error?.detalles ?? []).map((d) => [d.campo, d.mensaje]));
}

/** Fecha de hoy (AAAA-MM-DD) para el máximo de los campos de fecha de nacimiento. */
export function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}
