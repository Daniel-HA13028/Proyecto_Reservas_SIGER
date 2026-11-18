import { exec } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.SIGER_JWT_SECRETO || 'siger-dev-jwt-secret-key-2026-node';
const ACCESS_TTL_SEC = 1800; // 30 minutos
const TZ = 'America/El_Salvador';

const app = express();
app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Catálogo de errores (mismos códigos que CodigoError.java y mensajesError.js)
// ---------------------------------------------------------------------------
const ERRORES = {
  SOLICITUD_INVALIDA: [400, 'La solicitud no tiene un formato válido.'],
  PARAMETRO_INVALIDO: [400, 'Uno de los parámetros tiene un valor no válido.'],
  VALIDACION_FALLIDA: [422, 'Revisa los datos marcados en el formulario.'],
  NO_AUTENTICADO: [401, 'Inicia sesión para continuar.'],
  SESION_EXPIRADA: [401, 'Tu sesión expiró. Vuelve a iniciar sesión.'],
  SIN_PERMISO: [403, 'No tienes permiso para realizar esta acción.'],
  RECURSO_NO_ENCONTRADO: [404, 'No encontramos el recurso solicitado.'],
  RUTA_NO_ENCONTRADA: [404, 'La dirección solicitada no existe.'],
  ARCHIVO_DEMASIADO_GRANDE: [413, 'La imagen supera el tamaño máximo de 2 MB.'],
  ERROR_INTERNO: [500, 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.'],

  CREDENCIALES_INVALIDAS: [401, 'Correo o contraseña incorrectos.'],
  CUENTA_PENDIENTE: [403, 'Tu cuenta de organizador está pendiente de aprobación por un administrador.'],
  CUENTA_INACTIVA: [403, 'Tu cuenta está desactivada. Comunícate con soporte.'],
  INTENTOS_EXCEDIDOS: [429, 'Por seguridad bloqueamos el acceso con este correo durante 15 minutos.'],
  SESION_NO_VALIDA: [401, 'Tu sesión ya no es válida. Inicia sesión de nuevo.'],
  CORREO_YA_REGISTRADO: [409, 'Ya existe una cuenta con este correo.'],
  CONTRASENAS_NO_COINCIDEN: [422, 'La contraseña y su confirmación no coinciden.'],
  CONTRASENA_ACTUAL_INCORRECTA: [422, 'La contraseña actual no es correcta.'],
  ROL_NO_PERMITIDO_EN_REGISTRO: [422, 'Solo puedes registrarte como Participante u Organizador.'],
  ENLACE_VERIFICACION_INVALIDO: [422, 'El enlace de verificación no es válido o ya se usó.'],
  CODIGO_INVALIDO: [422, 'El código no es correcto.'],
  CODIGO_VENCIDO: [422, 'El código venció. Solicita uno nuevo.'],
  CODIGO_INTENTOS_AGOTADOS: [422, 'Superaste los 5 intentos. Solicita un código nuevo.'],

  AUTODESACTIVACION_NO_PERMITIDA: [409, 'No puedes desactivar tu propia cuenta.'],
  ROL_PROPIO_NO_MODIFICABLE: [409, 'No puedes cambiar tu propio rol.'],
  CUENTA_NO_PENDIENTE: [409, 'La cuenta no tiene una solicitud de organizador pendiente.'],
  MOTIVO_RECHAZO_REQUERIDO: [422, 'Indica el motivo del rechazo.'],

  CATEGORIA_DUPLICADA: [409, 'Ya existe una categoría con ese nombre.'],
  CATEGORIA_INACTIVA: [422, 'La categoría seleccionada está inactiva.'],

  FECHAS_EVENTO_INVALIDAS: [422, 'La fecha de fin debe ser posterior al inicio y la fecha límite no puede ser posterior al inicio.'],
  CAPACIDAD_MENOR_A_RESERVADOS: [409, 'La capacidad no puede ser menor que los cupos ya reservados.'],
  EVENTO_NO_EDITABLE: [409, 'Un evento cancelado o finalizado no se puede modificar.'],
  EVENTO_NO_PUBLICABLE: [409, 'Solo se pueden publicar eventos en borrador.'],
  EVENTO_YA_CANCELADO: [409, 'El evento ya está cancelado.'],
  EVENTO_NO_ELIMINABLE: [409, 'Solo se pueden eliminar eventos en borrador sin reservaciones.'],
  NO_ES_PROPIETARIO: [403, 'Solo el organizador del evento o un administrador pueden hacer esta acción.'],
  IMAGEN_INVALIDA: [422, 'La imagen debe ser JPG o PNG.'],

  EVENTO_NO_DISPONIBLE: [409, 'Este evento no acepta reservaciones en este momento.'],
  CUPO_AGOTADO: [409, 'No hay cupos suficientes para ti y tus acompañantes.'],
  RESERVA_DUPLICADA: [409, 'Ya tienes una reservación confirmada para este evento.'],
  ACOMPANANTES_EXCEDIDOS: [422, 'Superaste el número máximo de acompañantes del evento.'],
  CANCELACION_FUERA_DE_PLAZO: [422, 'Solo puedes cancelar hasta 24 horas antes del inicio del evento.'],
  RESERVACION_YA_CANCELADA: [409, 'La reservación ya está cancelada.'],

  CODIGO_QR_INVALIDO: [404, 'El código no corresponde a ninguna reservación.'],
  QR_DE_OTRO_EVENTO: [409, 'El comprobante pertenece a otro evento.'],
  RESERVACION_NO_CONFIRMADA: [409, 'La reservación está cancelada; no se puede registrar la asistencia.'],
  ASISTENCIA_YA_REGISTRADA: [409, 'Asistencia ya registrada.'],
  DESHACER_FUERA_DE_PLAZO: [409, 'Solo puedes deshacer una asistencia el mismo día del evento.'],
  ASISTENCIA_NO_REGISTRADA: [404, 'La reservación no tiene asistencia registrada.'],

  PERIODO_INVALIDO: [422, 'La fecha inicial no puede ser posterior a la final.'],
  REPORTE_REQUIERE_REFERENCIA: [422, 'Selecciona el evento u organizador del reporte.'],
  SOLICITUD_CERRADA: [409, 'La solicitud ya está cerrada.'],
};

class ApiError extends Error {
  constructor(codigo, mensajePersonalizado, detalles = []) {
    const [estado, mensajeDefault] = ERRORES[codigo] || [500, 'Error inesperado'];
    super(mensajePersonalizado || mensajeDefault);
    this.codigo = codigo;
    this.estado = estado;
    this.detalles = detalles;
  }
}

function sendError(res, err) {
  if (err instanceof ApiError) {
    return res.status(err.estado).json({
      error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles },
    });
  }
  console.error(err);
  return res.status(500).json({
    error: { codigo: 'ERROR_INTERNO', mensaje: ERRORES.ERROR_INTERNO[1], detalles: [] },
  });
}

// ---------------------------------------------------------------------------
// Utilidades criptográficas, JWT y fechas
// ---------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;
  if (storedHash.startsWith('scrypt$')) {
    const [, salt, derived] = storedHash.split('$');
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(check, 'hex'));
  }
  return password === storedHash;
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signJwt(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const nowSec = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: nowSec, exp: nowSec + ACCESS_TTL_SEC }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new ApiError('SESION_EXPIRADA');
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new ApiError('SESION_EXPIRADA');
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new ApiError('SESION_EXPIRADA');
  }
  return payload;
}

const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,72}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function svDateStr(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(date));
}

function svMonthStr(date = new Date()) {
  return svDateStr(date).slice(0, 7);
}

function addHours(base, h) {
  return new Date(base.getTime() + h * 3600_000);
}

function addDays(base, d) {
  return new Date(base.getTime() + d * 86400_000);
}

function addMinutes(base, m) {
  return new Date(base.getTime() + m * 60_000);
}

function truncHour(date) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

function parsePositiveId(raw) {
  if (!/^\d+$/.test(String(raw))) throw new ApiError('PARAMETRO_INVALIDO');
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) throw new ApiError('PARAMETRO_INVALIDO');
  return n;
}

function paginate(items, pagina = 1, limite = 10) {
  const p = Math.max(1, Number(pagina) || 1);
  const l = Math.min(100, Math.max(1, Number(limite) || 10));
  const totalElementos = items.length;
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / l));
  const start = (p - 1) * l;
  return {
    contenido: items.slice(start, start + l),
    pagina: p,
    limite: l,
    totalPaginas,
    totalElementos,
  };
}

function tasa(parte, total) {
  return total === 0 ? 0 : Math.round((parte * 1000) / total) / 10;
}

// ---------------------------------------------------------------------------
// Estado en memoria sembrado desde V3__categorias, V100__datos_demo, DataInitializer
// ---------------------------------------------------------------------------
const now = new Date();
const baseHour = truncHour(now);

const db = {
  seq: { usuario: 1, categoria: 1, evento: 1, reservacion: 1, asistencia: 1, notificacion: 1, bitacora: 1, soporte: 1 },
  usuarios: [],
  categorias: [],
  eventos: [],
  reservaciones: [],
  asistencias: [],
  notificaciones: [],
  bitacora: [],
  solicitudesSoporte: [],
  refreshTokens: new Map(), // token -> { idUsuario, expiresAt, recordarme }
  userTokens: new Map(), // token/key -> { idUsuario, tipo, code, correoNuevo, expiresAt, intentos, usado }
  uploads: new Map(), // filename -> { buffer, mime }
};

function seed() {
  const cats = [
    ['Tecnología', true],
    ['Negocios', true],
    ['Arte', true],
    ['Social', true],
    ['Conferencia', true],
    ['Taller', true],
    ['Deportes', false],
  ];
  for (const [nombre, activa] of cats) {
    db.categorias.push({
      idCategoria: db.seq.categoria++,
      nombre,
      activa,
      fechaCreacion: addDays(now, -90).toISOString(),
    });
  }

  const adminPass = process.env.SIGER_ADMIN_CONTRASENA || 'Admin#2026';
  const adminEmail = (process.env.SIGER_ADMIN_CORREO || 'admin@siger.test').trim().toLowerCase();
  const demoUsers = [
    ['Administrador', 'SIGER', adminEmail, null, 'Administrador', 'Activo', adminPass],
    ['Ana María', 'López Rivera', 'organizador.ana@siger.test', '1990-04-12', 'Organizador', 'Activo', 'Demo#2026'],
    ['Carlos José', 'Martínez Pineda', 'organizador.carlos@siger.test', '1987-09-03', 'Organizador', 'Activo', 'Demo#2026'],
    ['Lucía', 'Martínez Flores', 'participante01@siger.test', '2002-01-15', 'Participante', 'Activo', 'Demo#2026'],
    ['José', 'Hernández Cruz', 'participante02@siger.test', '2001-06-22', 'Participante', 'Activo', 'Demo#2026'],
    ['Sofía', 'Ramírez Ayala', 'participante03@siger.test', '2003-03-08', 'Participante', 'Activo', 'Demo#2026'],
    ['Diego', 'Castillo Mejía', 'participante04@siger.test', '2000-11-30', 'Participante', 'Activo', 'Demo#2026'],
    ['Valeria', 'Gómez Portillo', 'participante05@siger.test', '2002-08-19', 'Participante', 'Activo', 'Demo#2026'],
    ['Mateo', 'Rivas Alvarado', 'participante06@siger.test', '1999-12-05', 'Participante', 'Activo', 'Demo#2026'],
    ['Camila', 'Orellana Díaz', 'participante07@siger.test', '2004-02-27', 'Participante', 'Activo', 'Demo#2026'],
    ['Andrés', 'Molina Guevara', 'participante08@siger.test', '2001-10-10', 'Participante', 'Activo', 'Demo#2026'],
    ['Gabriela', 'Henríquez Lara', 'participante09@siger.test', '2003-05-14', 'Participante', 'Activo', 'Demo#2026'],
    ['Fernando', 'Aguilar Menjívar', 'participante10@siger.test', '1998-07-01', 'Participante', 'Inactivo', 'Demo#2026'],
  ];

  for (const [nombres, apellidos, correoElectronico, fechaNacimiento, rol, estadoCuenta, pwd] of demoUsers) {
    db.usuarios.push({
      idUsuario: db.seq.usuario++,
      nombres,
      apellidos,
      correoElectronico,
      contrasenaHash: hashPassword(pwd),
      fechaNacimiento,
      rol,
      estadoCuenta,
      correoVerificado: true,
      fechaRegistro: addDays(now, -60).toISOString(),
      ultimoAcceso: null,
    });
  }

  const catId = (name) => db.categorias.find((c) => c.nombre === name).idCategoria;
  const userId = (email) => db.usuarios.find((u) => u.correoElectronico === email).idUsuario;

  const demoEvents = [
    ['Congreso de Innovación Tecnológica 2026', 'Ponencias sobre inteligencia artificial, nube y desarrollo de software con invitados de la industria.', 'Tecnología', 20, 8, 'Auditorio Central, Ciudad Universitaria', 150, 2, 0, 'Publicado', null, 'organizador.ana@siger.test'],
    ['Taller de Spring Boot desde cero', 'Taller práctico: API REST con Java 21, Spring Boot y PostgreSQL. Llevar computadora.', 'Taller', 7, 4, 'Laboratorio 3, Escuela de Ingeniería de Sistemas', 25, 0, 10, 'Publicado', null, 'organizador.carlos@siger.test'],
    ['Feria de Emprendimiento Universitario', 'Exhibición de proyectos de emprendimiento estudiantil y charlas con inversionistas.', 'Negocios', 14, 6, 'Plaza Central, Ciudad Universitaria', 80, 1, 0, 'Publicado', null, 'organizador.ana@siger.test'],
    ['Exposición de Arte Digital', 'Muestra de ilustración, animación y arte generativo. Cupo limitado por recorrido guiado.', 'Arte', 3, 2, 'Sala de Exposiciones, Facultad de Artes', 5, 0, 3, 'Publicado', null, 'organizador.carlos@siger.test'],
    ['Noche de Integración Estudiantil', 'Actividad social de bienvenida para estudiantes de nuevo ingreso.', 'Social', 30, 4, 'Cafetería Central', 60, 1, 0, 'Borrador', null, 'organizador.ana@siger.test'],
    ['Conferencia de Ciberseguridad', 'Buenas prácticas de seguridad en aplicaciones web y gestión de incidentes.', 'Conferencia', 10, 3, 'Auditorio de Ingeniería', 100, 0, 0, 'Cancelado', 'El ponente principal no podrá asistir; se reprogramará más adelante.', 'organizador.carlos@siger.test'],
    ['Hackathon UES 2026', 'Competencia de 24 horas para resolver retos de la comunidad universitaria.', 'Tecnología', -20, 24, 'Edificio de Ingeniería en Sistemas', 40, 0, 0, 'Finalizado', null, 'organizador.ana@siger.test'],
    ['Taller de Diseño UX', 'Investigación con usuarios, prototipos y pruebas de usabilidad.', 'Taller', -5, 3, 'Laboratorio 1, Escuela de Ingeniería de Sistemas', 20, 0, 5, 'Finalizado', null, 'organizador.carlos@siger.test'],
  ];

  for (const [nombreEvento, descripcion, catName, startDays, durHours, ubicacion, cupoMaximo, maxAcompanantes, precio, estadoEvento, motivoCancelacion, orgEmail] of demoEvents) {
    const inicio = addDays(baseHour, startDays);
    const fin = addHours(inicio, durHours);
    const limite = addDays(inicio, -1);
    db.eventos.push({
      idEvento: db.seq.evento++,
      nombreEvento,
      descripcion,
      idCategoria: catId(catName),
      fechaHoraInicio: inicio.toISOString(),
      fechaHoraFin: fin.toISOString(),
      fechaLimiteReserva: limite.toISOString(),
      ubicacion,
      cupoMaximo,
      cupoDisponible: cupoMaximo,
      maxAcompanantes,
      precio,
      imagenUrl: null,
      requiereQr: true,
      estadoEvento,
      reprogramado: false,
      motivoCancelacion,
      idOrganizador: userId(orgEmail),
      fechaCreacion: addDays(now, -45).toISOString(),
      fechaActualizacion: addDays(now, -45).toISOString(),
    });
  }

  const demoReservations = [
    ['Congreso de Innovación Tecnológica 2026', 'participante01@siger.test', 0, null, 'Confirmada'],
    ['Congreso de Innovación Tecnológica 2026', 'participante02@siger.test', 1, 'Asisto con un compañero de trabajo.', 'Confirmada'],
    ['Congreso de Innovación Tecnológica 2026', 'participante03@siger.test', 0, null, 'Confirmada'],
    ['Congreso de Innovación Tecnológica 2026', 'participante04@siger.test', 0, null, 'Confirmada'],
    ['Congreso de Innovación Tecnológica 2026', 'participante05@siger.test', 0, null, 'Confirmada'],
    ['Congreso de Innovación Tecnológica 2026', 'participante06@siger.test', 0, null, 'Confirmada'],
    ['Congreso de Innovación Tecnológica 2026', 'participante07@siger.test', 0, null, 'Cancelada'],
    ['Taller de Spring Boot desde cero', 'participante01@siger.test', 0, null, 'Confirmada'],
    ['Taller de Spring Boot desde cero', 'participante03@siger.test', 0, 'Uso silla de ruedas.', 'Confirmada'],
    ['Taller de Spring Boot desde cero', 'participante05@siger.test', 0, null, 'Confirmada'],
    ['Feria de Emprendimiento Universitario', 'participante02@siger.test', 0, null, 'Confirmada'],
    ['Feria de Emprendimiento Universitario', 'participante04@siger.test', 1, null, 'Confirmada'],
    ['Exposición de Arte Digital', 'participante05@siger.test', 0, null, 'Confirmada'],
    ['Exposición de Arte Digital', 'participante06@siger.test', 0, null, 'Confirmada'],
    ['Exposición de Arte Digital', 'participante07@siger.test', 0, null, 'Confirmada'],
    ['Exposición de Arte Digital', 'participante08@siger.test', 0, null, 'Confirmada'],
    ['Exposición de Arte Digital', 'participante09@siger.test', 0, null, 'Confirmada'],
    ['Conferencia de Ciberseguridad', 'participante01@siger.test', 0, null, 'Cancelada'],
    ['Conferencia de Ciberseguridad', 'participante02@siger.test', 0, null, 'Cancelada'],
    ['Hackathon UES 2026', 'participante01@siger.test', 0, null, 'Confirmada'],
    ['Hackathon UES 2026', 'participante02@siger.test', 0, null, 'Confirmada'],
    ['Hackathon UES 2026', 'participante03@siger.test', 0, null, 'Confirmada'],
    ['Hackathon UES 2026', 'participante04@siger.test', 0, null, 'Confirmada'],
    ['Hackathon UES 2026', 'participante05@siger.test', 0, null, 'Confirmada'],
    ['Hackathon UES 2026', 'participante06@siger.test', 0, null, 'Confirmada'],
    ['Hackathon UES 2026', 'participante07@siger.test', 0, null, 'Confirmada'],
    ['Hackathon UES 2026', 'participante08@siger.test', 0, null, 'Confirmada'],
    ['Taller de Diseño UX', 'participante03@siger.test', 0, null, 'Confirmada'],
    ['Taller de Diseño UX', 'participante04@siger.test', 0, null, 'Confirmada'],
    ['Taller de Diseño UX', 'participante05@siger.test', 0, null, 'Confirmada'],
    ['Taller de Diseño UX', 'participante06@siger.test', 0, null, 'Confirmada'],
    ['Taller de Diseño UX', 'participante07@siger.test', 0, null, 'Confirmada'],
  ];

  for (const [evName, email, acompanantes, observaciones, estadoReservacion] of demoReservations) {
    const ev = db.eventos.find((e) => e.nombreEvento === evName);
    const idParticipante = userId(email);
    const rawFecha = addDays(new Date(ev.fechaLimiteReserva), -7);
    const fechaRes = rawFecha > now ? addDays(now, -2) : rawFecha;
    const fechaCanc = estadoReservacion === 'Cancelada'
      ? (addDays(new Date(ev.fechaLimiteReserva), -6) > now ? addDays(now, -1) : addDays(new Date(ev.fechaLimiteReserva), -6))
      : null;
    const codigoComprobante = crypto.createHash('md5').update(`siger-demo-${evName}-${email}`).digest('hex');
    db.reservaciones.push({
      idReservacion: db.seq.reservacion++,
      idEvento: ev.idEvento,
      idParticipante,
      cantidadAcompanantes: acompanantes,
      observaciones,
      monto: Number((ev.precio * (1 + acompanantes)).toFixed(2)),
      codigoComprobante,
      estadoReservacion,
      fechaReservacion: fechaRes.toISOString(),
      fechaCancelacion: fechaCanc ? fechaCanc.toISOString() : null,
    });
  }

  // Recalcular cupoDisponible
  for (const ev of db.eventos) {
    const ocupados = db.reservaciones
      .filter((r) => r.idEvento === ev.idEvento && r.estadoReservacion === 'Confirmada')
      .reduce((sum, r) => sum + 1 + r.cantidadAcompanantes, 0);
    ev.cupoDisponible = ev.cupoMaximo - ocupados;
  }

  const demoAttendances = [
    ['Hackathon UES 2026', 'participante01@siger.test', 'QR_Scanner', 5, false],
    ['Hackathon UES 2026', 'participante02@siger.test', 'QR_Scanner', 7, false],
    ['Hackathon UES 2026', 'participante03@siger.test', 'QR_Scanner', 9, false],
    ['Hackathon UES 2026', 'participante04@siger.test', 'Digital_Code', 12, false],
    ['Hackathon UES 2026', 'participante05@siger.test', 'QR_Scanner', 15, false],
    ['Hackathon UES 2026', 'participante06@siger.test', 'QR_Scanner', 18, false],
    ['Hackathon UES 2026', 'participante07@siger.test', 'Manual_Organizador', 25, false],
    ['Taller de Diseño UX', 'participante03@siger.test', 'QR_Scanner', 3, false],
    ['Taller de Diseño UX', 'participante04@siger.test', 'QR_Scanner', 6, false],
    ['Taller de Diseño UX', 'participante05@siger.test', 'Digital_Code', 8, false],
    ['Taller de Diseño UX', 'participante06@siger.test', 'Manual_Organizador', 10, true],
  ];

  for (const [evName, email, metodoValidacion, mins, anulada] of demoAttendances) {
    const ev = db.eventos.find((e) => e.nombreEvento === evName);
    const uid = userId(email);
    const resv = db.reservaciones.find((r) => r.idEvento === ev.idEvento && r.idParticipante === uid);
    db.asistencias.push({
      idAsistencia: db.seq.asistencia++,
      idReservacion: resv.idReservacion,
      fechaHoraValidacion: addMinutes(new Date(ev.fechaHoraInicio), mins).toISOString(),
      metodoValidacion,
      idRegistradoPor: ev.idOrganizador,
      anulada,
      fechaAnulacion: anulada ? addHours(new Date(ev.fechaHoraInicio), 1).toISOString() : null,
      idAnuladaPor: anulada ? ev.idOrganizador : null,
    });
  }

  const demoNotifs = [
    ['participante01@siger.test', 'Congreso de Innovación Tecnológica 2026', 'Confirmacion_Reserva', 'Reservación confirmada', 'Tu reservación para el Congreso de Innovación Tecnológica 2026 está confirmada. Presenta tu código QR en la entrada.', false, addDays(now, -13)],
    ['participante01@siger.test', 'Conferencia de Ciberseguridad', 'Cancelacion_Evento', 'Evento cancelado', 'La Conferencia de Ciberseguridad fue cancelada: el ponente principal no podrá asistir.', true, addDays(now, -2)],
    ['participante02@siger.test', 'Conferencia de Ciberseguridad', 'Cancelacion_Evento', 'Evento cancelado', 'La Conferencia de Ciberseguridad fue cancelada: el ponente principal no podrá asistir.', false, addDays(now, -2)],
    ['participante03@siger.test', 'Taller de Spring Boot desde cero', 'Recordatorio', 'Tu evento es pronto', 'Recuerda: el Taller de Spring Boot desde cero comienza en una semana.', false, addHours(now, -1)],
    ['participante08@siger.test', 'Exposición de Arte Digital', 'Confirmacion_Reserva', 'Reservación confirmada', 'Tu reservación para la Exposición de Arte Digital está confirmada.', false, addDays(now, -5)],
  ];

  for (const [email, evName, tipo, asunto, mensaje, leida, fecha] of demoNotifs) {
    const ev = db.eventos.find((e) => e.nombreEvento === evName);
    db.notificaciones.push({
      idNotificacion: db.seq.notificacion++,
      idUsuario: userId(email),
      idEvento: ev?.idEvento ?? null,
      tipo,
      asunto,
      mensaje,
      leida,
      fechaCreacion: fecha.toISOString(),
    });
  }

  const conf = db.eventos.find((e) => e.nombreEvento === 'Conferencia de Ciberseguridad');
  db.bitacora.push({
    idBitacora: db.seq.bitacora++,
    idUsuario: conf.idOrganizador,
    accion: 'CANCELAR_EVENTO',
    entidad: 'eventos',
    idEntidad: conf.idEvento,
    fecha: addDays(now, -2).toISOString(),
  });
  const anuladaAsist = db.asistencias.find((a) => a.anulada);
  if (anuladaAsist) {
    db.bitacora.push({
      idBitacora: db.seq.bitacora++,
      idUsuario: anuladaAsist.idAnuladaPor,
      accion: 'DESHACER_ASISTENCIA',
      entidad: 'asistencias',
      idEntidad: anuladaAsist.idAsistencia,
      fecha: anuladaAsist.fechaAnulacion,
    });
  }

  db.solicitudesSoporte.push(
    {
      idSolicitud: db.seq.soporte++,
      idUsuario: userId('participante03@siger.test'),
      correoContacto: 'participante03@siger.test',
      tipo: 'Consulta',
      descripcion: 'No encuentro dónde descargar el comprobante de mi reservación.',
      estado: 'Abierta',
      fechaCreacion: addDays(now, -1).toISOString(),
    },
    {
      idSolicitud: db.seq.soporte++,
      idUsuario: null,
      correoContacto: 'visitante@example.com',
      tipo: 'Acceso',
      descripcion: 'No me llegó el correo de verificación de la cuenta.',
      estado: 'En_Proceso',
      fechaCreacion: addDays(now, -3).toISOString(),
    },
  );
}

seed();

// ---------------------------------------------------------------------------
// Mappers DTO exactos
// ---------------------------------------------------------------------------
function toUsuarioResponse(u) {
  return {
    idUsuario: u.idUsuario,
    nombres: u.nombres,
    apellidos: u.apellidos,
    correoElectronico: u.correoElectronico,
    fechaNacimiento: u.fechaNacimiento || null,
    rol: u.rol,
    estadoCuenta: u.estadoCuenta,
    correoVerificado: u.correoVerificado,
    fechaRegistro: u.fechaRegistro,
    ultimoAcceso: u.ultimoAcceso,
  };
}

function getCatName(idCategoria) {
  return db.categorias.find((c) => c.idCategoria === idCategoria)?.nombre ?? 'General';
}

function toEventoResumen(ev) {
  return {
    idEvento: ev.idEvento,
    nombreEvento: ev.nombreEvento,
    idCategoria: ev.idCategoria,
    categoria: getCatName(ev.idCategoria),
    fechaHoraInicio: ev.fechaHoraInicio,
    fechaHoraFin: ev.fechaHoraFin,
    ubicacion: ev.ubicacion,
    cupoMaximo: ev.cupoMaximo,
    cupoDisponible: ev.cupoDisponible,
    lleno: ev.cupoDisponible === 0,
    precio: Number(ev.precio),
    imagenUrl: ev.imagenUrl,
    estadoEvento: ev.estadoEvento,
    reprogramado: ev.reprogramado,
  };
}

function toEventoDetalle(ev) {
  const org = db.usuarios.find((u) => u.idUsuario === ev.idOrganizador);
  const nowMs = Date.now();
  const aceptaReservaciones =
    ev.estadoEvento === 'Publicado' &&
    new Date(ev.fechaLimiteReserva).getTime() > nowMs &&
    ev.cupoDisponible > 0;
  return {
    ...toEventoResumen(ev),
    descripcion: ev.descripcion,
    fechaLimiteReserva: ev.fechaLimiteReserva,
    maxAcompanantes: ev.maxAcompanantes,
    requiereQr: ev.requiereQr,
    motivoCancelacion: ev.motivoCancelacion,
    aceptaReservaciones,
    organizador: org
      ? {
          idUsuario: org.idUsuario,
          nombreCompleto: `${org.nombres} ${org.apellidos}`,
          correoElectronico: org.correoElectronico,
        }
      : { idUsuario: ev.idOrganizador, nombreCompleto: 'Organizador', correoElectronico: '' },
    fechaCreacion: ev.fechaCreacion,
    fechaActualizacion: ev.fechaActualizacion,
  };
}

function activeAttendance(idReservacion) {
  return db.asistencias.find((a) => a.idReservacion === idReservacion && !a.anulada) || null;
}

function toReservacionResponse(r) {
  const ev = db.eventos.find((e) => e.idEvento === r.idEvento);
  const asist = activeAttendance(r.idReservacion);
  const hoursUntilStart = (new Date(ev.fechaHoraInicio).getTime() - Date.now()) / 3600_000;
  return {
    idReservacion: r.idReservacion,
    evento: toEventoResumen(ev),
    acompanantes: r.cantidadAcompanantes,
    observaciones: r.observaciones,
    monto: Number(r.monto),
    codigoComprobante: r.codigoComprobante,
    estadoReservacion: r.estadoReservacion,
    fechaReservacion: r.fechaReservacion,
    fechaCancelacion: r.fechaCancelacion,
    asistio: Boolean(asist),
    cancelable: r.estadoReservacion === 'Confirmada' && hoursUntilStart >= 24,
  };
}

function logBitacora(idUsuario, accion, entidad, idEntidad) {
  db.bitacora.unshift({
    idBitacora: db.seq.bitacora++,
    idUsuario,
    accion,
    entidad,
    idEntidad,
    fecha: new Date().toISOString(),
  });
}

function pushNotification(idUsuario, idEvento, tipo, asunto, mensaje) {
  db.notificaciones.unshift({
    idNotificacion: db.seq.notificacion++,
    idUsuario,
    idEvento: idEvento ?? null,
    tipo,
    asunto,
    mensaje,
    leida: false,
    fechaCreacion: new Date().toISOString(),
  });
}

function recalcDisponible(ev) {
  const ocupados = db.reservaciones
    .filter((r) => r.idEvento === ev.idEvento && r.estadoReservacion === 'Confirmada')
    .reduce((sum, r) => sum + 1 + r.cantidadAcompanantes, 0);
  ev.cupoDisponible = Math.max(0, ev.cupoMaximo - ocupados);
}

// ---------------------------------------------------------------------------
// Auth middlewares
// ---------------------------------------------------------------------------
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const payload = verifyJwt(header.slice(7));
    const u = db.usuarios.find((x) => x.idUsuario === payload.sub);
    if (!u || u.estadoCuenta !== 'Activo') {
      return next(new ApiError('SESION_EXPIRADA'));
    }
    req.user = u;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  optionalAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) return next(new ApiError('NO_AUTENTICADO'));
    return next();
  });
}

function requireRoles(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, (err) => {
      if (err) return next(err);
      if (!roles.includes(req.user.rol)) return next(new ApiError('SIN_PERMISO'));
      return next();
    });
  };
}

function issueAuthTokens(u, recordarme = false) {
  const accessToken = signJwt({ sub: u.idUsuario, rol: u.rol, email: u.correoElectronico });
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const ttlMs = recordarme ? 30 * 86400_000 : 86400_000;
  db.refreshTokens.set(refreshToken, {
    idUsuario: u.idUsuario,
    expiresAt: Date.now() + ttlMs,
    recordarme: Boolean(recordarme),
  });
  return {
    accessToken,
    refreshToken,
    tipoToken: 'Bearer',
    expiraEnSegundos: ACCESS_TTL_SEC,
    usuario: toUsuarioResponse(u),
  };
}

function manageEventOrThrow(idEvento, user) {
  const ev = db.eventos.find((e) => e.idEvento === idEvento);
  if (!ev) throw new ApiError('RECURSO_NO_ENCONTRADO');
  if (user.rol !== 'Administrador' && ev.idOrganizador !== user.idUsuario) {
    throw new ApiError('NO_ES_PROPIETARIO');
  }
  return ev;
}

// ---------------------------------------------------------------------------
// Exportadores mínimos reales (PDF 1.4 y XLSX PKZIP sin dependencias externas)
// ---------------------------------------------------------------------------
function toAsciiPdf(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()\\]/g, '\\$&');
}

function buildPdfBuffer(titulo, subtitulos, secciones) {
  const lines = [];
  lines.push({ text: titulo, size: 15, bold: true });
  for (const s of subtitulos) lines.push({ text: s, size: 9, bold: false });
  lines.push({ text: ' ', size: 8 });
  for (const sec of secciones) {
    lines.push({ text: sec.titulo, size: 12, bold: true });
    lines.push({ text: sec.columnas.join('  |  '), size: 9, bold: true });
    if (sec.filas.length === 0) {
      lines.push({ text: '(Sin registros)', size: 9, bold: false });
    } else {
      for (const fila of sec.filas) {
        lines.push({ text: fila.join('  |  '), size: 8, bold: false });
      }
    }
    lines.push({ text: ' ', size: 8 });
  }

  const pages = [];
  let y = 760;
  let current = [];
  for (const l of lines) {
    if (y < 50) {
      pages.push(current);
      current = [];
      y = 760;
    }
    current.push(`BT /${l.bold ? 'F2' : 'F1'} ${l.size} Tf 40 ${y} Td (${toAsciiPdf(l.text).slice(0, 110)}) Tj ET`);
    y -= l.size + 6;
  }
  if (current.length) pages.push(current);

  const objects = [];
  const addObj = (body) => {
    objects.push(body);
    return objects.length;
  };
  const f1 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const f2 = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesObjId = addObj(''); // placeholder
  const pageIds = [];

  for (const p of pages) {
    const stream = p.join('\n');
    const contentId = addObj(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesObjId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    pageIds.push(pageId);
  }
  objects[pagesObjId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesObjId} 0 R >>`);

  let out = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(out, 'utf8'));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = Buffer.byteLength(out, 'utf8');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(out, 'utf8');
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createZipStore(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const crc = crc32(dataBuf);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuf.length, 18);
    localHeader.writeUInt32LE(dataBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuf, dataBuf);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuf.length, 20);
    centralHeader.writeUInt32LE(dataBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + dataBuf.length;
  }

  const centralSize = centralParts.reduce((s, b) => s + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function xmlEsc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colRef(idx) {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildXlsxBuffer(titulo, subtitulos, secciones) {
  const rows = [];
  rows.push([titulo]);
  for (const s of subtitulos) rows.push([s]);
  rows.push([]);
  for (const sec of secciones) {
    rows.push([sec.titulo]);
    rows.push(sec.columnas);
    for (const f of sec.filas) rows.push(f);
    rows.push([]);
  }

  const sheetRowsXml = rows
    .map((cells, rIdx) => {
      if (!cells.length) return '';
      const rowNum = rIdx + 1;
      const cellsXml = cells
        .map((val, cIdx) => `<c r="${colRef(cIdx)}${rowNum}" t="inlineStr"><is><t>${xmlEsc(val)}</t></is></c>`)
        .join('');
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .filter(Boolean)
    .join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRowsXml}</sheetData></worksheet>`;
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="SIGER" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.worksheet+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;

  return createZipStore([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'xl/workbook.xml', data: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    { name: 'xl/worksheets/sheet1.xml', data: sheetXml },
  ]);
}

function sendExport(res, formato, nombreBase, titulo, subtitulos, secciones) {
  if (formato === 'xlsx') {
    const buf = buildXlsxBuffer(titulo, subtitulos, secciones);
    res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  }
  const buf = buildPdfBuffer(titulo, subtitulos, secciones);
  res.setHeader('Content-Disposition', `attachment; filename="${nombreBase}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  return res.send(buf);
}

// ---------------------------------------------------------------------------
// Health & Uploads
// ---------------------------------------------------------------------------
app.get('/actuator/health', (_req, res) => {
  res.json({ status: 'UP' });
});

app.get('/uploads/eventos/:filename', (req, res) => {
  const item = db.uploads.get(req.params.filename);
  if (!item) return res.status(404).end();
  res.setHeader('Content-Type', item.mime);
  return res.send(item.buffer);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// AUTH & PERFIL (/api/v1/auth/*, /api/v1/perfil*)
// ---------------------------------------------------------------------------
app.post('/api/v1/auth/registro', (req, res, next) => {
  try {
    const { nombres, apellidos, correoElectronico, fechaNacimiento, rol, contrasena, confirmacionContrasena, aceptaTerminos } = req.body || {};
    const detalles = [];
    if (!nombres?.trim()) detalles.push({ campo: 'nombres', mensaje: 'Escribe tus nombres.' });
    if (!apellidos?.trim()) detalles.push({ campo: 'apellidos', mensaje: 'Escribe tus apellidos.' });
    if (!correoElectronico || !EMAIL_REGEX.test(correoElectronico.trim())) {
      detalles.push({ campo: 'correoElectronico', mensaje: 'Escribe un correo válido.' });
    }
    if (!contrasena || !PASS_REGEX.test(contrasena)) {
      detalles.push({ campo: 'contrasena', mensaje: 'La contraseña no cumple los requisitos.' });
    }
    if (!aceptaTerminos) detalles.push({ campo: 'aceptaTerminos', mensaje: 'Debes aceptar los términos.' });
    if (detalles.length) throw new ApiError('VALIDACION_FALLIDA', null, detalles);
    if (contrasena !== confirmacionContrasena) throw new ApiError('CONTRASENAS_NO_COINCIDEN');
    if (!['Participante', 'Organizador'].includes(rol)) throw new ApiError('ROL_NO_PERMITIDO_EN_REGISTRO');

    const email = correoElectronico.trim().toLowerCase();
    if (db.usuarios.some((u) => u.correoElectronico === email)) throw new ApiError('CORREO_YA_REGISTRADO');

    const u = {
      idUsuario: db.seq.usuario++,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correoElectronico: email,
      contrasenaHash: hashPassword(contrasena),
      fechaNacimiento: fechaNacimiento || null,
      rol,
      estadoCuenta: rol === 'Organizador' ? 'Pendiente' : 'Activo',
      correoVerificado: true,
      fechaRegistro: new Date().toISOString(),
      ultimoAcceso: null,
    };
    db.usuarios.push(u);
    const verifyTok = crypto.randomBytes(24).toString('hex');
    db.userTokens.set(verifyTok, {
      idUsuario: u.idUsuario,
      tipo: 'Verificacion_Correo',
      expiresAt: Date.now() + 86400_000,
      usado: false,
    });
    pushNotification(u.idUsuario, null, 'Bienvenida', '¡Bienvenido a SIGER!', `Hola ${u.nombres}, tu cuenta fue creada.`);
    return res.status(201).json(toUsuarioResponse(u));
  } catch (err) {
    return next(err);
  }
});

app.post('/api/v1/auth/login', (req, res, next) => {
  try {
    const { correoElectronico, contrasena, recordarme } = req.body || {};
    const email = String(correoElectronico || '').trim().toLowerCase();
    const u = db.usuarios.find((x) => x.correoElectronico === email);
    if (!u || !verifyPassword(String(contrasena || ''), u.contrasenaHash)) {
      throw new ApiError('CREDENCIALES_INVALIDAS');
    }
    if (u.estadoCuenta === 'Pendiente') throw new ApiError('CUENTA_PENDIENTE');
    if (u.estadoCuenta === 'Inactivo') throw new ApiError('CUENTA_INACTIVA');

    u.ultimoAcceso = new Date().toISOString();
    logBitacora(u.idUsuario, 'LOGIN', 'usuarios', u.idUsuario);
    return res.json(issueAuthTokens(u, Boolean(recordarme)));
  } catch (err) {
    return next(err);
  }
});

app.post('/api/v1/auth/refresh', (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    const entry = refreshToken ? db.refreshTokens.get(refreshToken) : null;
    if (!entry || entry.expiresAt < Date.now()) {
      if (refreshToken) db.refreshTokens.delete(refreshToken);
      throw new ApiError('SESION_NO_VALIDA');
    }
    const u = db.usuarios.find((x) => x.idUsuario === entry.idUsuario);
    if (!u || u.estadoCuenta !== 'Activo') {
      db.refreshTokens.delete(refreshToken);
      throw new ApiError('SESION_NO_VALIDA');
    }
    db.refreshTokens.delete(refreshToken);
    return res.json(issueAuthTokens(u, entry.recordarme));
  } catch (err) {
    return next(err);
  }
});

app.post('/api/v1/auth/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) db.refreshTokens.delete(refreshToken);
  return res.status(204).end();
});

app.post('/api/v1/auth/verificar-correo', (req, res, next) => {
  try {
    const { token } = req.body || {};
    const entry = token ? db.userTokens.get(token) : null;
    if (!entry || entry.usado || entry.expiresAt < Date.now()) {
      throw new ApiError('ENLACE_VERIFICACION_INVALIDO');
    }
    const u = db.usuarios.find((x) => x.idUsuario === entry.idUsuario);
    if (!u) throw new ApiError('ENLACE_VERIFICACION_INVALIDO');
    if (entry.tipo === 'Cambio_Correo' && entry.correoNuevo) {
      if (db.usuarios.some((x) => x.correoElectronico === entry.correoNuevo && x.idUsuario !== u.idUsuario)) {
        throw new ApiError('CORREO_YA_REGISTRADO');
      }
      u.correoElectronico = entry.correoNuevo;
    }
    u.correoVerificado = true;
    entry.usado = true;
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

app.post('/api/v1/auth/reenviar-verificacion', (_req, res) => {
  return res.status(202).end();
});

app.post('/api/v1/auth/recuperar', (req, res) => {
  const email = String(req.body?.correoElectronico || '').trim().toLowerCase();
  const u = db.usuarios.find((x) => x.correoElectronico === email);
  if (u) {
    const code = String(crypto.randomInt(100000, 1000000));
    db.userTokens.set(`rec:${email}`, {
      idUsuario: u.idUsuario,
      tipo: 'Recuperacion_Contrasena',
      code,
      expiresAt: Date.now() + 15 * 60_000,
      intentos: 0,
      usado: false,
    });
  }
  return res.status(202).end();
});

app.post('/api/v1/auth/verificar-codigo', (req, res, next) => {
  try {
    const email = String(req.body?.correoElectronico || '').trim().toLowerCase();
    const codigo = String(req.body?.codigo || '').trim();
    const entry = db.userTokens.get(`rec:${email}`);
    if (!entry || entry.usado) throw new ApiError('CODIGO_INVALIDO');
    if (entry.expiresAt < Date.now()) throw new ApiError('CODIGO_VENCIDO');
    if (entry.intentos >= 5) throw new ApiError('CODIGO_INTENTOS_AGOTADOS');
    if (entry.code !== codigo) {
      entry.intentos += 1;
      if (entry.intentos >= 5) throw new ApiError('CODIGO_INTENTOS_AGOTADOS');
      throw new ApiError('CODIGO_INVALIDO');
    }
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

app.post('/api/v1/auth/restablecer', (req, res, next) => {
  try {
    const { correoElectronico, codigo, nuevaContrasena, confirmacionContrasena } = req.body || {};
    const email = String(correoElectronico || '').trim().toLowerCase();
    if (!PASS_REGEX.test(String(nuevaContrasena || ''))) throw new ApiError('VALIDACION_FALLIDA');
    if (nuevaContrasena !== confirmacionContrasena) throw new ApiError('CONTRASENAS_NO_COINCIDEN');
    const entry = db.userTokens.get(`rec:${email}`);
    if (!entry || entry.usado || entry.code !== String(codigo || '').trim()) throw new ApiError('CODIGO_INVALIDO');
    if (entry.expiresAt < Date.now()) throw new ApiError('CODIGO_VENCIDO');
    const u = db.usuarios.find((x) => x.idUsuario === entry.idUsuario);
    if (!u) throw new ApiError('CODIGO_INVALIDO');
    u.contrasenaHash = hashPassword(nuevaContrasena);
    entry.usado = true;
    for (const [k, v] of db.refreshTokens.entries()) {
      if (v.idUsuario === u.idUsuario) db.refreshTokens.delete(k);
    }
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/perfil', requireAuth, (req, res) => {
  res.json(toUsuarioResponse(req.user));
});

app.put('/api/v1/perfil', requireAuth, (req, res, next) => {
  try {
    const { nombres, apellidos, correoElectronico, fechaNacimiento } = req.body || {};
    const detalles = [];
    if (!nombres?.trim()) detalles.push({ campo: 'nombres', mensaje: 'Escribe tus nombres.' });
    if (!apellidos?.trim()) detalles.push({ campo: 'apellidos', mensaje: 'Escribe tus apellidos.' });
    if (!correoElectronico || !EMAIL_REGEX.test(correoElectronico.trim())) {
      detalles.push({ campo: 'correoElectronico', mensaje: 'Escribe un correo válido.' });
    }
    if (detalles.length) throw new ApiError('VALIDACION_FALLIDA', null, detalles);

    const nuevoEmail = correoElectronico.trim().toLowerCase();
    if (nuevoEmail !== req.user.correoElectronico && db.usuarios.some((x) => x.correoElectronico === nuevoEmail)) {
      throw new ApiError('CORREO_YA_REGISTRADO');
    }
    req.user.nombres = nombres.trim();
    req.user.apellidos = apellidos.trim();
    req.user.fechaNacimiento = fechaNacimiento || null;
    if (nuevoEmail !== req.user.correoElectronico) {
      logBitacora(req.user.idUsuario, 'CAMBIO_CORREO', 'usuarios', req.user.idUsuario);
      // En entorno demo sin SMTP, registramos el token y mantenemos el correo actual hasta confirmar (o notificamos).
      const tok = crypto.randomBytes(24).toString('hex');
      db.userTokens.set(tok, {
        idUsuario: req.user.idUsuario,
        tipo: 'Cambio_Correo',
        correoNuevo: nuevoEmail,
        expiresAt: Date.now() + 86400_000,
        usado: false,
      });
    }
    return res.json(toUsuarioResponse(req.user));
  } catch (err) {
    return next(err);
  }
});

app.put('/api/v1/perfil/contrasena', requireAuth, (req, res, next) => {
  try {
    const { contrasenaActual, nuevaContrasena, confirmacionContrasena } = req.body || {};
    if (!verifyPassword(String(contrasenaActual || ''), req.user.contrasenaHash)) {
      throw new ApiError('CONTRASENA_ACTUAL_INCORRECTA');
    }
    if (!PASS_REGEX.test(String(nuevaContrasena || ''))) throw new ApiError('VALIDACION_FALLIDA');
    if (nuevaContrasena !== confirmacionContrasena) throw new ApiError('CONTRASENAS_NO_COINCIDEN');
    req.user.contrasenaHash = hashPassword(nuevaContrasena);
    logBitacora(req.user.idUsuario, 'CAMBIO_CONTRASENA', 'usuarios', req.user.idUsuario);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// CATEGORÍAS (/api/v1/categorias*)
// ---------------------------------------------------------------------------
app.get('/api/v1/categorias', optionalAuth, (req, res, next) => {
  try {
    const todas = req.query.todas === 'true';
    if (todas) {
      if (!req.user) throw new ApiError('NO_AUTENTICADO');
      if (req.user.rol !== 'Administrador') throw new ApiError('SIN_PERMISO');
      return res.json(
        db.categorias.map((c) => ({
          ...c,
          totalEventos: db.eventos.filter((e) => e.idCategoria === c.idCategoria).length,
        })),
      );
    }
    return res.json(db.categorias.filter((c) => c.activa));
  } catch (err) {
    return next(err);
  }
});

app.post('/api/v1/categorias', requireRoles('Administrador'), (req, res, next) => {
  try {
    const nombre = String(req.body?.nombre || '').trim();
    if (!nombre || nombre.length > 60) throw new ApiError('VALIDACION_FALLIDA');
    if (db.categorias.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw new ApiError('CATEGORIA_DUPLICADA');
    }
    const c = {
      idCategoria: db.seq.categoria++,
      nombre,
      activa: true,
      fechaCreacion: new Date().toISOString(),
    };
    db.categorias.push(c);
    return res.status(201).json(c);
  } catch (err) {
    return next(err);
  }
});

app.put('/api/v1/categorias/:id', requireRoles('Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const cat = db.categorias.find((c) => c.idCategoria === id);
    if (!cat) throw new ApiError('RECURSO_NO_ENCONTRADO');
    const nombre = String(req.body?.nombre || '').trim();
    if (!nombre || nombre.length > 60) throw new ApiError('VALIDACION_FALLIDA');
    if (db.categorias.some((c) => c.idCategoria !== id && c.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw new ApiError('CATEGORIA_DUPLICADA');
    }
    cat.nombre = nombre;
    return res.json(cat);
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/categorias/:id/estado', requireRoles('Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const cat = db.categorias.find((c) => c.idCategoria === id);
    if (!cat) throw new ApiError('RECURSO_NO_ENCONTRADO');
    cat.activa = Boolean(req.body?.activa);
    return res.json(cat);
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// EVENTOS (/api/v1/eventos*)
// ---------------------------------------------------------------------------
app.get('/api/v1/eventos', (req, res) => {
  const { buscar, categoria, desde, hasta, ubicacion, orden = 'fecha', pagina = 1, limite = 10 } = req.query;
  const nowMs = Date.now();
  let lista = db.eventos.filter((e) => e.estadoEvento === 'Publicado' && new Date(e.fechaHoraInicio).getTime() > nowMs);

  if (buscar) {
    const q = String(buscar).trim().toLowerCase();
    lista = lista.filter((e) => e.nombreEvento.toLowerCase().includes(q) || e.ubicacion.toLowerCase().includes(q));
  }
  if (categoria) {
    const catId = Number(categoria);
    lista = lista.filter((e) => e.idCategoria === catId);
  }
  if (ubicacion) {
    const u = String(ubicacion).trim().toLowerCase();
    lista = lista.filter((e) => e.ubicacion.toLowerCase().includes(u));
  }
  if (desde) {
    lista = lista.filter((e) => svDateStr(e.fechaHoraInicio) >= String(desde));
  }
  if (hasta) {
    lista = lista.filter((e) => svDateStr(e.fechaHoraInicio) <= String(hasta));
  }

  if (orden === 'popularidad') {
    lista.sort((a, b) => (b.cupoMaximo - b.cupoDisponible) - (a.cupoMaximo - a.cupoDisponible));
  } else {
    lista.sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio));
  }

  return res.json(paginate(lista.map(toEventoResumen), pagina, limite));
});

app.get('/api/v1/eventos/mios', requireRoles('Organizador', 'Administrador'), (req, res) => {
  const { estado, pagina = 1, limite = 10 } = req.query;
  let lista = db.eventos.filter((e) => req.user.rol === 'Administrador' || e.idOrganizador === req.user.idUsuario);
  if (estado) lista = lista.filter((e) => e.estadoEvento === estado);
  lista.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
  return res.json(paginate(lista.map(toEventoResumen), pagina, limite));
});

app.get('/api/v1/eventos/:id', optionalAuth, (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const ev = db.eventos.find((e) => e.idEvento === id);
    if (!ev) throw new ApiError('RECURSO_NO_ENCONTRADO');
    if (ev.estadoEvento === 'Borrador') {
      const puedeVer = req.user && (req.user.rol === 'Administrador' || req.user.idUsuario === ev.idOrganizador);
      if (!puedeVer) throw new ApiError('RECURSO_NO_ENCONTRADO');
    }
    return res.json(toEventoDetalle(ev));
  } catch (err) {
    return next(err);
  }
});

function parseEventoMultipart(req) {
  let datos = req.body?.datos;
  if (req.files?.datos?.[0]) {
    datos = req.files.datos[0].buffer.toString('utf8');
  }
  if (typeof datos === 'string') {
    try {
      datos = JSON.parse(datos);
    } catch {
      throw new ApiError('SOLICITUD_INVALIDA');
    }
  }
  if (!datos || typeof datos !== 'object') throw new ApiError('SOLICITUD_INVALIDA');

  let imagenUrl = null;
  const imgFile = req.files?.imagen?.[0];
  if (imgFile) {
    if (!['image/jpeg', 'image/png'].includes(imgFile.mimetype)) {
      throw new ApiError('IMAGEN_INVALIDA');
    }
    const ext = imgFile.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `${crypto.randomUUID()}.${ext}`;
    db.uploads.set(filename, { buffer: imgFile.buffer, mime: imgFile.mimetype });
    imagenUrl = `/uploads/eventos/${filename}`;
  }
  return { datos, imagenUrl };
}

const eventoUploadFields = upload.fields([
  { name: 'datos', maxCount: 1 },
  { name: 'imagen', maxCount: 1 },
]);

app.post('/api/v1/eventos', requireRoles('Organizador', 'Administrador'), eventoUploadFields, (req, res, next) => {
  try {
    const { datos, imagenUrl } = parseEventoMultipart(req);
    const cat = db.categorias.find((c) => c.idCategoria === Number(datos.idCategoria));
    if (!cat || !cat.activa) throw new ApiError('CATEGORIA_INACTIVA');

    const inicio = new Date(datos.fechaHoraInicio);
    const fin = new Date(datos.fechaHoraFin);
    const limite = datos.fechaLimiteReserva ? new Date(datos.fechaLimiteReserva) : inicio;
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio || limite > inicio) {
      throw new ApiError('FECHAS_EVENTO_INVALIDAS');
    }
    const cupoMaximo = Number(datos.cupoMaximo);
    if (!(cupoMaximo > 0)) throw new ApiError('VALIDACION_FALLIDA');

    const nowIso = new Date().toISOString();
    const ev = {
      idEvento: db.seq.evento++,
      nombreEvento: String(datos.nombreEvento || '').trim(),
      descripcion: String(datos.descripcion || '').trim(),
      idCategoria: cat.idCategoria,
      fechaHoraInicio: inicio.toISOString(),
      fechaHoraFin: fin.toISOString(),
      fechaLimiteReserva: limite.toISOString(),
      ubicacion: String(datos.ubicacion || '').trim(),
      cupoMaximo,
      cupoDisponible: cupoMaximo,
      maxAcompanantes: Math.max(0, Number(datos.maxAcompanantes) || 0),
      precio: Math.max(0, Number(datos.precio) || 0),
      imagenUrl,
      requiereQr: datos.requiereQr !== false,
      estadoEvento: 'Borrador',
      reprogramado: false,
      motivoCancelacion: null,
      idOrganizador: req.user.idUsuario,
      fechaCreacion: nowIso,
      fechaActualizacion: nowIso,
    };
    db.eventos.push(ev);
    logBitacora(req.user.idUsuario, 'CREAR_EVENTO', 'eventos', ev.idEvento);
    return res.status(201).json(toEventoDetalle(ev));
  } catch (err) {
    return next(err);
  }
});

app.put('/api/v1/eventos/:id', requireRoles('Organizador', 'Administrador'), eventoUploadFields, (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const ev = manageEventOrThrow(id, req.user);
    if (['Cancelado', 'Finalizado'].includes(ev.estadoEvento)) {
      throw new ApiError('EVENTO_NO_EDITABLE');
    }
    const { datos, imagenUrl } = parseEventoMultipart(req);
    const cat = db.categorias.find((c) => c.idCategoria === Number(datos.idCategoria));
    if (!cat) throw new ApiError('RECURSO_NO_ENCONTRADO');
    if (!cat.activa && cat.idCategoria !== ev.idCategoria) throw new ApiError('CATEGORIA_INACTIVA');

    const inicio = new Date(datos.fechaHoraInicio);
    const fin = new Date(datos.fechaHoraFin);
    const limite = datos.fechaLimiteReserva ? new Date(datos.fechaLimiteReserva) : inicio;
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio || limite > inicio) {
      throw new ApiError('FECHAS_EVENTO_INVALIDAS');
    }
    const cupoMaximo = Number(datos.cupoMaximo);
    const reservados = db.reservaciones
      .filter((r) => r.idEvento === ev.idEvento && r.estadoReservacion === 'Confirmada')
      .reduce((sum, r) => sum + 1 + r.cantidadAcompanantes, 0);
    if (cupoMaximo < reservados) throw new ApiError('CAPACIDAD_MENOR_A_RESERVADOS');

    const ubicacion = String(datos.ubicacion || '').trim();
    const cambioHorarioOLugar =
      ev.fechaHoraInicio !== inicio.toISOString() ||
      ev.fechaHoraFin !== fin.toISOString() ||
      ev.ubicacion !== ubicacion;

    ev.nombreEvento = String(datos.nombreEvento || '').trim();
    ev.descripcion = String(datos.descripcion || '').trim();
    ev.idCategoria = cat.idCategoria;
    ev.fechaHoraInicio = inicio.toISOString();
    ev.fechaHoraFin = fin.toISOString();
    ev.fechaLimiteReserva = limite.toISOString();
    ev.ubicacion = ubicacion;
    ev.cupoMaximo = cupoMaximo;
    ev.maxAcompanantes = Math.max(0, Number(datos.maxAcompanantes) || 0);
    ev.precio = Math.max(0, Number(datos.precio) || 0);
    ev.requiereQr = datos.requiereQr !== false;
    if (imagenUrl) ev.imagenUrl = imagenUrl;
    ev.fechaActualizacion = new Date().toISOString();
    recalcDisponible(ev);

    if (ev.estadoEvento === 'Publicado' && cambioHorarioOLugar) {
      ev.reprogramado = true;
      for (const r of db.reservaciones.filter((x) => x.idEvento === ev.idEvento && x.estadoReservacion === 'Confirmada')) {
        pushNotification(
          r.idParticipante,
          ev.idEvento,
          'Cambio_Evento',
          `Evento reprogramado: ${ev.nombreEvento}`,
          `El evento «${ev.nombreEvento}» actualizó su fecha, hora o ubicación (${ev.ubicacion}).`,
        );
      }
    }
    logBitacora(req.user.idUsuario, 'EDITAR_EVENTO', 'eventos', ev.idEvento);
    return res.json(toEventoDetalle(ev));
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/eventos/:id/publicar', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const ev = manageEventOrThrow(id, req.user);
    if (ev.estadoEvento !== 'Borrador') throw new ApiError('EVENTO_NO_PUBLICABLE');
    ev.estadoEvento = 'Publicado';
    ev.fechaActualizacion = new Date().toISOString();
    logBitacora(req.user.idUsuario, 'PUBLICAR_EVENTO', 'eventos', ev.idEvento);
    return res.json(toEventoDetalle(ev));
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/eventos/:id/cancelar', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const ev = manageEventOrThrow(id, req.user);
    if (ev.estadoEvento === 'Cancelado') throw new ApiError('EVENTO_YA_CANCELADO');
    if (ev.estadoEvento === 'Finalizado') throw new ApiError('EVENTO_NO_EDITABLE');
    const motivo = String(req.body?.motivo || '').trim();
    if (!motivo) throw new ApiError('VALIDACION_FALLIDA');

    ev.estadoEvento = 'Cancelado';
    ev.motivoCancelacion = motivo;
    ev.fechaActualizacion = new Date().toISOString();

    const nowIso = new Date().toISOString();
    for (const r of db.reservaciones.filter((x) => x.idEvento === ev.idEvento && x.estadoReservacion === 'Confirmada')) {
      r.estadoReservacion = 'Cancelada';
      r.fechaCancelacion = nowIso;
      pushNotification(
        r.idParticipante,
        ev.idEvento,
        'Cancelacion_Evento',
        'Evento cancelado',
        `El evento «${ev.nombreEvento}» fue cancelado: ${motivo}`,
      );
    }
    recalcDisponible(ev);
    logBitacora(req.user.idUsuario, 'CANCELAR_EVENTO', 'eventos', ev.idEvento);
    return res.json(toEventoDetalle(ev));
  } catch (err) {
    return next(err);
  }
});

app.delete('/api/v1/eventos/:id', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const ev = manageEventOrThrow(id, req.user);
    const tieneRes = db.reservaciones.some((r) => r.idEvento === ev.idEvento);
    if (ev.estadoEvento !== 'Borrador' || tieneRes) throw new ApiError('EVENTO_NO_ELIMINABLE');
    db.eventos = db.eventos.filter((e) => e.idEvento !== id);
    logBitacora(req.user.idUsuario, 'ELIMINAR_EVENTO', 'eventos', id);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// RESERVACIONES (/api/v1/eventos/:id/reservaciones, /api/v1/reservaciones/*)
// ---------------------------------------------------------------------------
app.post('/api/v1/eventos/:id/reservaciones', requireRoles('Participante'), (req, res, next) => {
  try {
    const idEvento = parsePositiveId(req.params.id);
    const ev = db.eventos.find((e) => e.idEvento === idEvento);
    if (!ev) throw new ApiError('RECURSO_NO_ENCONTRADO');
    if (ev.estadoEvento !== 'Publicado' || new Date(ev.fechaLimiteReserva).getTime() <= Date.now()) {
      throw new ApiError('EVENTO_NO_DISPONIBLE');
    }
    const yaReservado = db.reservaciones.some(
      (r) => r.idEvento === idEvento && r.idParticipante === req.user.idUsuario && r.estadoReservacion === 'Confirmada',
    );
    if (yaReservado) throw new ApiError('RESERVA_DUPLICADA');

    const acomp = Math.max(0, Number(req.body?.cantidadAcompanantes) || 0);
    if (acomp > ev.maxAcompanantes) throw new ApiError('ACOMPANANTES_EXCEDIDOS');
    if (ev.cupoDisponible < 1 + acomp) throw new ApiError('CUPO_AGOTADO');

    const r = {
      idReservacion: db.seq.reservacion++,
      idEvento,
      idParticipante: req.user.idUsuario,
      cantidadAcompanantes: acomp,
      observaciones: req.body?.observaciones ? String(req.body.observaciones).trim().slice(0, 300) : null,
      monto: Number((ev.precio * (1 + acomp)).toFixed(2)),
      codigoComprobante: crypto.randomBytes(16).toString('hex'),
      estadoReservacion: 'Confirmada',
      fechaReservacion: new Date().toISOString(),
      fechaCancelacion: null,
    };
    db.reservaciones.push(r);
    recalcDisponible(ev);
    pushNotification(
      req.user.idUsuario,
      ev.idEvento,
      'Confirmacion_Reserva',
      'Reservación confirmada',
      `Tu reservación para «${ev.nombreEvento}» está confirmada. Presenta tu código QR en la entrada.`,
    );
    return res.status(201).json(toReservacionResponse(r));
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/reservaciones/mias', requireRoles('Participante'), (req, res) => {
  const { grupo = 'proximas', pagina = 1, limite = 10 } = req.query;
  const nowMs = Date.now();
  const mias = db.reservaciones.filter((r) => r.idParticipante === req.user.idUsuario);
  let filtradas;
  if (grupo === 'canceladas') {
    filtradas = mias
      .filter((r) => r.estadoReservacion === 'Cancelada')
      .sort((a, b) => new Date(b.fechaCancelacion) - new Date(a.fechaCancelacion));
  } else if (grupo === 'pasadas') {
    filtradas = mias
      .filter((r) => {
        const ev = db.eventos.find((e) => e.idEvento === r.idEvento);
        return r.estadoReservacion === 'Confirmada' && new Date(ev.fechaHoraFin).getTime() <= nowMs;
      })
      .sort((a, b) => {
        const ea = db.eventos.find((e) => e.idEvento === a.idEvento);
        const eb = db.eventos.find((e) => e.idEvento === b.idEvento);
        return new Date(eb.fechaHoraInicio) - new Date(ea.fechaHoraInicio);
      });
  } else {
    filtradas = mias
      .filter((r) => {
        const ev = db.eventos.find((e) => e.idEvento === r.idEvento);
        return r.estadoReservacion === 'Confirmada' && new Date(ev.fechaHoraFin).getTime() > nowMs;
      })
      .sort((a, b) => {
        const ea = db.eventos.find((e) => e.idEvento === a.idEvento);
        const eb = db.eventos.find((e) => e.idEvento === b.idEvento);
        return new Date(ea.fechaHoraInicio) - new Date(eb.fechaHoraInicio);
      });
  }
  return res.json(paginate(filtradas.map(toReservacionResponse), pagina, limite));
});

app.get('/api/v1/reservaciones/:id', requireRoles('Participante'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const r = db.reservaciones.find((x) => x.idReservacion === id && x.idParticipante === req.user.idUsuario);
    if (!r) throw new ApiError('RECURSO_NO_ENCONTRADO');
    return res.json(toReservacionResponse(r));
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/reservaciones/:id/qr', requireRoles('Participante'), async (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const r = db.reservaciones.find((x) => x.idReservacion === id && x.idParticipante === req.user.idUsuario);
    if (!r) throw new ApiError('RECURSO_NO_ENCONTRADO');
    const png = await QRCode.toBuffer(r.codigoComprobante, { type: 'png', width: 320, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `inline; filename="comprobante-${id}.png"`);
    return res.send(png);
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/reservaciones/:id/cancelar', requireRoles('Participante'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const r = db.reservaciones.find((x) => x.idReservacion === id && x.idParticipante === req.user.idUsuario);
    if (!r) throw new ApiError('RECURSO_NO_ENCONTRADO');
    if (r.estadoReservacion === 'Cancelada') throw new ApiError('RESERVACION_YA_CANCELADA');
    const ev = db.eventos.find((e) => e.idEvento === r.idEvento);
    if ((new Date(ev.fechaHoraInicio).getTime() - Date.now()) / 3600_000 < 24) {
      throw new ApiError('CANCELACION_FUERA_DE_PLAZO');
    }
    r.estadoReservacion = 'Cancelada';
    r.fechaCancelacion = new Date().toISOString();
    recalcDisponible(ev);
    pushNotification(
      req.user.idUsuario,
      ev.idEvento,
      'Cancelacion_Reserva',
      'Reservación cancelada',
      `Tu reservación para «${ev.nombreEvento}» fue cancelada y los cupos quedaron libres.`,
    );
    return res.json(toReservacionResponse(r));
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// ASISTENCIA (/api/v1/eventos/:id/participantes*, /asistencias*)
// ---------------------------------------------------------------------------
function buildParticipantesList(ev, buscar, asistio) {
  const hoySv = svDateStr();
  const mismoDia = svDateStr(ev.fechaHoraInicio) === hoySv;

  let filas = db.reservaciones
    .filter((r) => r.idEvento === ev.idEvento && r.estadoReservacion === 'Confirmada')
    .map((r) => {
      const p = db.usuarios.find((u) => u.idUsuario === r.idParticipante);
      const a = activeAttendance(r.idReservacion);
      return {
        idReservacion: r.idReservacion,
        idParticipante: r.idParticipante,
        nombreCompleto: `${p.nombres} ${p.apellidos}`,
        correoElectronico: p.correoElectronico,
        acompanantes: r.cantidadAcompanantes,
        estadoReservacion: r.estadoReservacion,
        asistio: Boolean(a),
        fechaHoraValidacion: a ? a.fechaHoraValidacion : null,
        metodoValidacion: a ? a.metodoValidacion : null,
        deshacible: Boolean(a) && mismoDia,
      };
    });

  if (buscar) {
    const q = String(buscar).trim().toLowerCase();
    filas = filas.filter((f) => f.nombreCompleto.toLowerCase().includes(q) || f.correoElectronico.toLowerCase().includes(q));
  }
  if (asistio === 'true' || asistio === true) {
    filas = filas.filter((f) => f.asistio);
  } else if (asistio === 'false' || asistio === false) {
    filas = filas.filter((f) => !f.asistio);
  }
  filas.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
  return filas;
}

app.get('/api/v1/eventos/:id/participantes', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const ev = manageEventOrThrow(id, req.user);
    const { buscar, asistio, pagina = 1, limite = 10 } = req.query;
    const filas = buildParticipantesList(ev, buscar, asistio);
    return res.json(paginate(filas, pagina, limite));
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/eventos/:id/participantes/exportar', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const ev = manageEventOrThrow(id, req.user);
    const { formato = 'pdf', buscar, asistio } = req.query;
    const filas = buildParticipantesList(ev, buscar, asistio);
    logBitacora(req.user.idUsuario, 'EXPORTAR_PARTICIPANTES', 'eventos', ev.idEvento);
    return sendExport(
      res,
      formato,
      `participantes-evento-${ev.idEvento}`,
      `SIGER · Participantes: ${ev.nombreEvento}`,
      [`Generado: ${new Date().toISOString()}`, `Solicitado por: ${req.user.nombres} ${req.user.apellidos}`],
      [
        {
          titulo: 'Lista de participantes',
          columnas: ['Nombre', 'Correo', 'Acompanantes', 'Asistio', 'Metodo'],
          filas: filas.map((f) => [
            f.nombreCompleto,
            f.correoElectronico,
            String(f.acompanantes),
            f.asistio ? 'Si' : 'No',
            f.metodoValidacion || '-',
          ]),
        },
      ],
    );
  } catch (err) {
    return next(err);
  }
});

function toAsistenciaResponse(a, resv) {
  const p = db.usuarios.find((u) => u.idUsuario === resv.idParticipante);
  const reg = db.usuarios.find((u) => u.idUsuario === a.idRegistradoPor);
  return {
    idAsistencia: a.idAsistencia,
    idReservacion: a.idReservacion,
    participante: `${p.nombres} ${p.apellidos}`,
    acompanantes: resv.cantidadAcompanantes,
    fechaHoraValidacion: a.fechaHoraValidacion,
    metodoValidacion: a.metodoValidacion,
    registradoPor: reg ? `${reg.nombres} ${reg.apellidos}` : 'Sistema',
  };
}

app.post('/api/v1/eventos/:id/asistencias/qr', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const idEvento = parsePositiveId(req.params.id);
    manageEventOrThrow(idEvento, req.user);
    const codigo = String(req.body?.codigo || '').trim();
    const metodo = req.body?.metodo || 'QR_Scanner';
    const resv = db.reservaciones.find((r) => r.codigoComprobante === codigo);
    if (!resv) throw new ApiError('CODIGO_QR_INVALIDO');
    if (resv.idEvento !== idEvento) throw new ApiError('QR_DE_OTRO_EVENTO');
    if (resv.estadoReservacion !== 'Confirmada') throw new ApiError('RESERVACION_NO_CONFIRMADA');
    if (activeAttendance(resv.idReservacion)) throw new ApiError('ASISTENCIA_YA_REGISTRADA');

    const a = {
      idAsistencia: db.seq.asistencia++,
      idReservacion: resv.idReservacion,
      fechaHoraValidacion: new Date().toISOString(),
      metodoValidacion: metodo,
      idRegistradoPor: req.user.idUsuario,
      anulada: false,
      fechaAnulacion: null,
      idAnuladaPor: null,
    };
    db.asistencias.push(a);
    logBitacora(req.user.idUsuario, 'MARCAR_ASISTENCIA', 'asistencias', a.idAsistencia);
    return res.status(201).json(toAsistenciaResponse(a, resv));
  } catch (err) {
    return next(err);
  }
});

app.post('/api/v1/eventos/:id/asistencias', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const idEvento = parsePositiveId(req.params.id);
    manageEventOrThrow(idEvento, req.user);
    const idReservacion = parsePositiveId(req.body?.idReservacion);
    const resv = db.reservaciones.find((r) => r.idReservacion === idReservacion && r.idEvento === idEvento);
    if (!resv) throw new ApiError('RECURSO_NO_ENCONTRADO');
    if (resv.estadoReservacion !== 'Confirmada') throw new ApiError('RESERVACION_NO_CONFIRMADA');
    if (activeAttendance(resv.idReservacion)) throw new ApiError('ASISTENCIA_YA_REGISTRADA');

    const a = {
      idAsistencia: db.seq.asistencia++,
      idReservacion: resv.idReservacion,
      fechaHoraValidacion: new Date().toISOString(),
      metodoValidacion: 'Manual_Organizador',
      idRegistradoPor: req.user.idUsuario,
      anulada: false,
      fechaAnulacion: null,
      idAnuladaPor: null,
    };
    db.asistencias.push(a);
    logBitacora(req.user.idUsuario, 'MARCAR_ASISTENCIA', 'asistencias', a.idAsistencia);
    return res.status(201).json(toAsistenciaResponse(a, resv));
  } catch (err) {
    return next(err);
  }
});

app.delete('/api/v1/eventos/:id/asistencias/:idReservacion', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const idEvento = parsePositiveId(req.params.id);
    const idReservacion = parsePositiveId(req.params.idReservacion);
    const ev = manageEventOrThrow(idEvento, req.user);
    const resv = db.reservaciones.find((r) => r.idReservacion === idReservacion && r.idEvento === idEvento);
    if (!resv) throw new ApiError('RECURSO_NO_ENCONTRADO');
    const a = activeAttendance(resv.idReservacion);
    if (!a) throw new ApiError('ASISTENCIA_NO_REGISTRADA');
    if (svDateStr(ev.fechaHoraInicio) !== svDateStr()) throw new ApiError('DESHACER_FUERA_DE_PLAZO');

    a.anulada = true;
    a.fechaAnulacion = new Date().toISOString();
    a.idAnuladaPor = req.user.idUsuario;
    logBitacora(req.user.idUsuario, 'DESHACER_ASISTENCIA', 'asistencias', a.idAsistencia);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/eventos/:id/asistencias/resumen', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const idEvento = parsePositiveId(req.params.id);
    manageEventOrThrow(idEvento, req.user);
    const confirmadas = db.reservaciones.filter((r) => r.idEvento === idEvento && r.estadoReservacion === 'Confirmada');
    const resvMap = new Map(confirmadas.map((r) => [r.idReservacion, r]));
    const vigentes = db.asistencias
      .filter((a) => !a.anulada && resvMap.has(a.idReservacion))
      .sort((a, b) => new Date(b.fechaHoraValidacion) - new Date(a.fechaHoraValidacion));

    const intervalosMap = new Map();
    for (const a of vigentes) {
      const ms = new Date(a.fechaHoraValidacion).getTime();
      const bucket = new Date(Math.floor(ms / 600_000) * 600_000).toISOString();
      intervalosMap.set(bucket, (intervalosMap.get(bucket) || 0) + 1);
    }
    const ingresosPorIntervalo = [...intervalosMap.entries()]
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([inicio, cantidad]) => ({ inicio, cantidad }));

    return res.json({
      idEvento,
      registrados: confirmadas.length,
      personasEsperadas: confirmadas.reduce((s, r) => s + 1 + r.cantidadAcompanantes, 0),
      asistentes: vigentes.length,
      porcentajeAsistencia: tasa(vigentes.length, confirmadas.length),
      ingresosPorIntervalo,
      ultimosValidados: vigentes.slice(0, 10).map((a) => toAsistenciaResponse(a, resvMap.get(a.idReservacion))),
      generadoEn: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// DASHBOARDS (/api/v1/dashboard/*)
// ---------------------------------------------------------------------------
app.get('/api/v1/dashboard/admin', requireRoles('Administrador'), (_req, res) => {
  const nowMs = Date.now();
  const usuariosActivos = db.usuarios.filter((u) => u.estadoCuenta === 'Activo').length;
  const organizadoresPendientes = db.usuarios.filter((u) => u.estadoCuenta === 'Pendiente').length;
  const eventosActivos = db.eventos.filter((e) => e.estadoEvento === 'Publicado' && new Date(e.fechaHoraFin).getTime() > nowMs).length;
  const reservacionesConfirmadas = db.reservaciones.filter((r) => r.estadoReservacion === 'Confirmada').length;
  const solicitudesSoporteAbiertas = db.solicitudesSoporte.filter((s) => ['Abierta', 'En_Proceso'].includes(s.estado)).length;

  const curMonth = svMonthStr(now);
  const [cy, cm] = curMonth.split('-').map(Number);
  const asistenciaPorPeriodo = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(cy, cm - 1 - i, 15));
    const mes = d.toISOString().slice(0, 7);
    const evsMes = db.eventos.filter(
      (e) =>
        ['Publicado', 'Finalizado'].includes(e.estadoEvento) &&
        new Date(e.fechaHoraInicio).getTime() <= nowMs &&
        svMonthStr(e.fechaHoraInicio) === mes,
    );
    const evIds = new Set(evsMes.map((e) => e.idEvento));
    const confMes = db.reservaciones.filter((r) => evIds.has(r.idEvento) && r.estadoReservacion === 'Confirmada');
    const resIds = new Set(confMes.map((r) => r.idReservacion));
    const asistMes = db.asistencias.filter((a) => !a.anulada && resIds.has(a.idReservacion));
    asistenciaPorPeriodo.push({ etiqueta: mes, valor: tasa(asistMes.length, confMes.length) });
  }

  const actividadReciente = db.bitacora.slice(0, 10).map((b) => {
    const u = db.usuarios.find((x) => x.idUsuario === b.idUsuario);
    return {
      fecha: b.fecha,
      accion: b.accion,
      usuario: u ? `${u.nombres} ${u.apellidos}` : 'Sistema',
      entidad: b.entidad,
      idEntidad: b.idEntidad,
    };
  });

  res.json({
    usuariosActivos,
    organizadoresPendientes,
    eventosActivos,
    reservacionesConfirmadas,
    solicitudesSoporteAbiertas,
    asistenciaPorPeriodo,
    actividadReciente,
  });
});

app.get('/api/v1/dashboard/organizador', requireRoles('Organizador'), (req, res) => {
  const nowMs = Date.now();
  const misEventos = db.eventos.filter((e) => e.idOrganizador === req.user.idUsuario);
  const activos = misEventos.filter((e) => e.estadoEvento === 'Publicado' && new Date(e.fechaHoraFin).getTime() > nowMs).length;

  const noCancelIds = new Set(misEventos.filter((e) => e.estadoEvento !== 'Cancelado').map((e) => e.idEvento));
  const totalParticipantes = db.reservaciones
    .filter((r) => noCancelIds.has(r.idEvento) && r.estadoReservacion === 'Confirmada')
    .reduce((sum, r) => sum + 1 + r.cantidadAcompanantes, 0);

  const iniciados = misEventos.filter(
    (e) => ['Publicado', 'Finalizado'].includes(e.estadoEvento) && new Date(e.fechaHoraInicio).getTime() <= nowMs,
  );
  const tasas = [];
  for (const ev of iniciados) {
    const conf = db.reservaciones.filter((r) => r.idEvento === ev.idEvento && r.estadoReservacion === 'Confirmada');
    if (conf.length > 0) {
      const ids = new Set(conf.map((r) => r.idReservacion));
      const asist = db.asistencias.filter((a) => !a.anulada && ids.has(a.idReservacion)).length;
      tasas.push((100 * asist) / conf.length);
    }
  }
  const porcentajeAsistenciaPromedio = tasas.length ? Math.round((tasas.reduce((a, b) => a + b, 0) / tasas.length) * 10) / 10 : 0;

  const proximosEventos = misEventos
    .filter((e) => e.estadoEvento === 'Publicado' && new Date(e.fechaHoraInicio).getTime() > nowMs)
    .sort((a, b) => new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio))
    .slice(0, 5)
    .map(toEventoResumen);

  const misEvMap = new Map(misEventos.map((e) => [e.idEvento, e]));
  const reservacionesRecientes = db.reservaciones
    .filter((r) => misEvMap.has(r.idEvento) && r.estadoReservacion === 'Confirmada')
    .sort((a, b) => new Date(b.fechaReservacion) - new Date(a.fechaReservacion))
    .slice(0, 8)
    .map((r) => {
      const p = db.usuarios.find((u) => u.idUsuario === r.idParticipante);
      return {
        idReservacion: r.idReservacion,
        nombreEvento: misEvMap.get(r.idEvento).nombreEvento,
        participante: `${p.nombres} ${p.apellidos}`,
        acompanantes: r.cantidadAcompanantes,
        fechaReservacion: r.fechaReservacion,
      };
    });

  res.json({
    eventosActivos: activos,
    totalParticipantes,
    porcentajeAsistenciaPromedio,
    proximosEventos,
    reservacionesRecientes,
  });
});

app.get('/api/v1/dashboard/participante', requireRoles('Participante'), (req, res) => {
  const nowMs = Date.now();
  const misIds = new Set(db.reservaciones.filter((r) => r.idParticipante === req.user.idUsuario).map((r) => r.idReservacion));
  const eventosAsistidos = db.asistencias.filter((a) => !a.anulada && misIds.has(a.idReservacion)).length;

  const proximasReservaciones = db.reservaciones
    .filter((r) => {
      const ev = db.eventos.find((e) => e.idEvento === r.idEvento);
      return r.idParticipante === req.user.idUsuario && r.estadoReservacion === 'Confirmada' && new Date(ev.fechaHoraFin).getTime() > nowMs;
    })
    .sort((a, b) => {
      const ea = db.eventos.find((e) => e.idEvento === a.idEvento);
      const eb = db.eventos.find((e) => e.idEvento === b.idEvento);
      return new Date(ea.fechaHoraInicio) - new Date(eb.fechaHoraInicio);
    })
    .slice(0, 5)
    .map(toReservacionResponse);

  const catsPreferidas = new Set(
    db.reservaciones
      .filter((r) => r.idParticipante === req.user.idUsuario)
      .map((r) => db.eventos.find((e) => e.idEvento === r.idEvento)?.idCategoria)
      .filter(Boolean),
  );
  const confirmadosEvIds = new Set(
    db.reservaciones
      .filter((r) => r.idParticipante === req.user.idUsuario && r.estadoReservacion === 'Confirmada')
      .map((r) => r.idEvento),
  );

  const eventosRecomendados = db.eventos
    .filter(
      (e) =>
        e.estadoEvento === 'Publicado' &&
        new Date(e.fechaLimiteReserva).getTime() > nowMs &&
        e.cupoDisponible > 0 &&
        !confirmadosEvIds.has(e.idEvento),
    )
    .sort((a, b) => {
      const pa = catsPreferidas.has(a.idCategoria) ? 1 : 0;
      const pb = catsPreferidas.has(b.idCategoria) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return new Date(a.fechaHoraInicio) - new Date(b.fechaHoraInicio);
    })
    .slice(0, 6)
    .map(toEventoResumen);

  res.json({ proximasReservaciones, eventosAsistidos, eventosRecomendados });
});

// ---------------------------------------------------------------------------
// REPORTES (/api/v1/reportes*)
// ---------------------------------------------------------------------------
function generarDatosReporte(user, { tipo = 'global', desde, hasta, id }) {
  if (desde && hasta && String(desde) > String(hasta)) throw new ApiError('PERIODO_INVALIDO');
  const admin = user.rol === 'Administrador';
  let effTipo = tipo;
  let refId = id ? Number(id) : null;

  if (effTipo === 'evento') {
    if (!refId) throw new ApiError('REPORTE_REQUIERE_REFERENCIA');
    manageEventOrThrow(refId, user);
  } else if (!admin) {
    if (effTipo === 'organizador' && refId && refId !== user.idUsuario) {
      throw new ApiError('NO_ES_PROPIETARIO');
    }
    effTipo = 'organizador';
    refId = user.idUsuario;
  } else if (effTipo === 'organizador') {
    if (!refId) throw new ApiError('REPORTE_REQUIERE_REFERENCIA');
    const org = db.usuarios.find((u) => u.idUsuario === refId && u.rol === 'Organizador');
    if (!org) throw new ApiError('RECURSO_NO_ENCONTRADO');
  } else {
    effTipo = 'global';
    refId = null;
  }

  let evs = db.eventos.filter((e) => !['Borrador', 'Cancelado'].includes(e.estadoEvento));
  if (effTipo === 'organizador') evs = evs.filter((e) => e.idOrganizador === refId);
  if (effTipo === 'evento') evs = evs.filter((e) => e.idEvento === refId);
  if (desde) evs = evs.filter((e) => svDateStr(e.fechaHoraInicio) >= String(desde));
  if (hasta) evs = evs.filter((e) => svDateStr(e.fechaHoraInicio) <= String(hasta));

  const evMap = new Map(evs.map((e) => [e.idEvento, e]));
  const resvs = db.reservaciones.filter((r) => evMap.has(r.idEvento) && r.estadoReservacion === 'Confirmada');
  const resMap = new Map(resvs.map((r) => [r.idReservacion, r]));
  const asists = db.asistencias.filter((a) => !a.anulada && resMap.has(a.idReservacion));

  const nowMs = Date.now();
  const resIniciados = resvs.filter((r) => new Date(evMap.get(r.idEvento).fechaHoraInicio).getTime() <= nowMs);
  const resIniSet = new Set(resIniciados.map((r) => r.idReservacion));
  const asistIniciados = asists.filter((a) => resIniSet.has(a.idReservacion));

  const ingresosSimulados = Number(resvs.reduce((s, r) => s + Number(r.monto), 0).toFixed(2));
  const participantesDistintos = new Set(resvs.map((r) => r.idParticipante)).size;

  // Ventana de series (diaria si < 62 días, si no mensual últimos 12 meses)
  const endStr = hasta ? String(hasta) : svDateStr(now);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const startStr = desde
    ? String(desde)
    : new Date(Date.UTC(ey, em - 12, 1)).toISOString().slice(0, 10);
  const diffDays = (new Date(endStr) - new Date(startStr)) / 86400_000;
  const diaria = diffDays < 62;

  const keys = [];
  if (diaria) {
    let cur = new Date(`${startStr}T12:00:00Z`);
    const end = new Date(`${endStr}T12:00:00Z`);
    while (cur <= end) {
      keys.push(cur.toISOString().slice(0, 10));
      cur = addDays(cur, 1);
    }
  } else {
    let curY = Number(startStr.slice(0, 4));
    let curM = Number(startStr.slice(5, 7));
    const endYm = endStr.slice(0, 7);
    while (`${curY}-${String(curM).padStart(2, '0')}` <= endYm) {
      keys.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM += 1;
      if (curM > 12) {
        curM = 1;
        curY += 1;
      }
    }
  }

  const keyOf = (iso) => (diaria ? svDateStr(iso) : svMonthStr(iso));
  const tendCount = new Map();
  for (const r of resvs) {
    const k = keyOf(r.fechaReservacion);
    tendCount.set(k, (tendCount.get(k) || 0) + 1);
  }
  const tendenciaReservaciones = keys.map((etiqueta) => ({ etiqueta, valor: tendCount.get(etiqueta) || 0 }));

  const regCount = new Map();
  if (effTipo === 'global') {
    for (const u of db.usuarios) {
      const k = keyOf(u.fechaRegistro);
      regCount.set(k, (regCount.get(k) || 0) + 1);
    }
  } else {
    const primeraPorPart = new Map();
    for (const r of resvs) {
      const prev = primeraPorPart.get(r.idParticipante);
      if (!prev || new Date(r.fechaReservacion) < new Date(prev)) primeraPorPart.set(r.idParticipante, r.fechaReservacion);
    }
    for (const fecha of primeraPorPart.values()) {
      const k = keyOf(fecha);
      regCount.set(k, (regCount.get(k) || 0) + 1);
    }
  }
  const registrosPorMes = keys.map((etiqueta) => ({ etiqueta, valor: regCount.get(etiqueta) || 0 }));

  const catGroups = new Map();
  for (const ev of evs) {
    const cName = getCatName(ev.idCategoria);
    if (!catGroups.has(cName)) catGroups.set(cName, { evs: [], res: 0, asi: 0, resIni: 0, asiIni: 0 });
    catGroups.get(cName).evs.push(ev);
  }
  for (const r of resvs) {
    const ev = evMap.get(r.idEvento);
    const g = catGroups.get(getCatName(ev.idCategoria));
    g.res += 1;
    const ini = new Date(ev.fechaHoraInicio).getTime() <= nowMs;
    if (ini) g.resIni += 1;
    if (asists.some((a) => a.idReservacion === r.idReservacion)) {
      g.asi += 1;
      if (ini) g.asiIni += 1;
    }
  }
  const rendimientoPorCategoria = [...catGroups.entries()]
    .map(([categoria, g]) => ({
      categoria,
      eventos: g.evs.length,
      reservaciones: g.res,
      asistencias: g.asi,
      tasaAsistencia: tasa(g.asiIni, g.resIni),
    }))
    .sort((a, b) => b.reservaciones - a.reservaciones || a.categoria.localeCompare(b.categoria, 'es'));

  const eventosMayorAsistencia = evs
    .map((ev) => {
      const evRes = resvs.filter((r) => r.idEvento === ev.idEvento);
      const evResIds = new Set(evRes.map((r) => r.idReservacion));
      const evAsist = asists.filter((a) => evResIds.has(a.idReservacion)).length;
      const ini = new Date(ev.fechaHoraInicio).getTime() <= nowMs;
      return {
        idEvento: ev.idEvento,
        nombreEvento: ev.nombreEvento,
        fechaHoraInicio: ev.fechaHoraInicio,
        categoria: getCatName(ev.idCategoria),
        cupoMaximo: ev.cupoMaximo,
        reservaciones: evRes.length,
        asistencias: evAsist,
        tasaAsistencia: ini ? tasa(evAsist, evRes.length) : 0,
        ingresos: Number(evRes.reduce((s, r) => s + Number(r.monto), 0).toFixed(2)),
      };
    })
    .sort((a, b) => b.asistencias - a.asistencias || b.reservaciones - a.reservaciones)
    .slice(0, 10);

  return {
    tipo: effTipo,
    desde: desde || null,
    hasta: hasta || null,
    idReferencia: refId,
    totalEventos: evs.length,
    totalParticipantes: participantesDistintos,
    reservacionesConfirmadas: resvs.length,
    asistencias: asists.length,
    tasaAsistencia: tasa(asistIniciados.length, resIniciados.length),
    ingresosSimulados,
    registrosPorMes,
    tendenciaReservaciones,
    rendimientoPorCategoria,
    eventosMayorAsistencia,
  };
}

app.get('/api/v1/reportes', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    return res.json(generarDatosReporte(req.user, req.query));
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/reportes/exportar', requireRoles('Organizador', 'Administrador'), (req, res, next) => {
  try {
    const formato = req.query.formato || 'pdf';
    const r = generarDatosReporte(req.user, req.query);
    logBitacora(req.user.idUsuario, 'EXPORTAR_REPORTE', 'reportes', r.idReferencia);
    return sendExport(
      res,
      formato,
      `reporte_${r.tipo}`,
      `SIGER · Reporte ${r.tipo}`,
      [`Generado: ${new Date().toISOString()}`, `Solicitado por: ${req.user.nombres} ${req.user.apellidos}`],
      [
        {
          titulo: 'Resumen',
          columnas: ['Indicador', 'Valor'],
          filas: [
            ['Eventos', String(r.totalEventos)],
            ['Participantes', String(r.totalParticipantes)],
            ['Reservaciones confirmadas', String(r.reservacionesConfirmadas)],
            ['Asistencias', String(r.asistencias)],
            ['Tasa de asistencia', `${r.tasaAsistencia}%`],
            ['Ingresos simulados', `US$ ${r.ingresosSimulados.toFixed(2)}`],
          ],
        },
        {
          titulo: 'Por categoria',
          columnas: ['Categoria', 'Eventos', 'Reservaciones', 'Asistencias', 'Tasa'],
          filas: r.rendimientoPorCategoria.map((c) => [c.categoria, String(c.eventos), String(c.reservaciones), String(c.asistencias), `${c.tasaAsistencia}%`]),
        },
      ],
    );
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// USUARIOS ADMIN (/api/v1/usuarios*)
// ---------------------------------------------------------------------------
function filterUsuarios({ buscar, rol, estado }) {
  let lista = [...db.usuarios];
  if (buscar) {
    const q = String(buscar).trim().toLowerCase();
    lista = lista.filter(
      (u) =>
        u.nombres.toLowerCase().includes(q) ||
        u.apellidos.toLowerCase().includes(q) ||
        u.correoElectronico.toLowerCase().includes(q),
    );
  }
  if (rol) lista = lista.filter((u) => u.rol === rol);
  if (estado) lista = lista.filter((u) => u.estadoCuenta === estado);
  lista.sort((a, b) => a.idUsuario - b.idUsuario);
  return lista;
}

app.get('/api/v1/usuarios', requireRoles('Administrador'), (req, res) => {
  const { buscar, rol, estado, pagina = 1, limite = 10 } = req.query;
  const lista = filterUsuarios({ buscar, rol, estado }).map(toUsuarioResponse);
  return res.json(paginate(lista, pagina, limite));
});

app.post('/api/v1/usuarios', requireRoles('Administrador'), (req, res, next) => {
  try {
    const { nombres, apellidos, correoElectronico, fechaNacimiento, rol } = req.body || {};
    const email = String(correoElectronico || '').trim().toLowerCase();
    if (!nombres?.trim() || !apellidos?.trim() || !EMAIL_REGEX.test(email) || !['Administrador', 'Organizador', 'Participante'].includes(rol)) {
      throw new ApiError('VALIDACION_FALLIDA');
    }
    if (db.usuarios.some((u) => u.correoElectronico === email)) throw new ApiError('CORREO_YA_REGISTRADO');

    const u = {
      idUsuario: db.seq.usuario++,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correoElectronico: email,
      contrasenaHash: hashPassword('Demo#2026'),
      fechaNacimiento: fechaNacimiento || null,
      rol,
      estadoCuenta: 'Activo',
      correoVerificado: true,
      fechaRegistro: new Date().toISOString(),
      ultimoAcceso: null,
    };
    db.usuarios.push(u);
    logBitacora(req.user.idUsuario, 'CREAR_USUARIO', 'usuarios', u.idUsuario);
    return res.status(201).json(toUsuarioResponse(u));
  } catch (err) {
    return next(err);
  }
});

app.put('/api/v1/usuarios/:id', requireRoles('Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const u = db.usuarios.find((x) => x.idUsuario === id);
    if (!u) throw new ApiError('RECURSO_NO_ENCONTRADO');
    const { nombres, apellidos, correoElectronico, fechaNacimiento } = req.body || {};
    const email = String(correoElectronico || '').trim().toLowerCase();
    if (!nombres?.trim() || !apellidos?.trim() || !EMAIL_REGEX.test(email)) throw new ApiError('VALIDACION_FALLIDA');
    if (email !== u.correoElectronico && db.usuarios.some((x) => x.correoElectronico === email)) {
      throw new ApiError('CORREO_YA_REGISTRADO');
    }
    if (email !== u.correoElectronico) u.correoVerificado = false;
    u.nombres = nombres.trim();
    u.apellidos = apellidos.trim();
    u.correoElectronico = email;
    u.fechaNacimiento = fechaNacimiento || null;
    logBitacora(req.user.idUsuario, 'EDITAR_USUARIO', 'usuarios', u.idUsuario);
    return res.json(toUsuarioResponse(u));
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/usuarios/:id/estado', requireRoles('Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (id === req.user.idUsuario) throw new ApiError('AUTODESACTIVACION_NO_PERMITIDA');
    const u = db.usuarios.find((x) => x.idUsuario === id);
    if (!u) throw new ApiError('RECURSO_NO_ENCONTRADO');
    const { estado } = req.body || {};
    if (!['Activo', 'Inactivo'].includes(estado)) throw new ApiError('ESTADO_CUENTA_NO_PERMITIDO');
    u.estadoCuenta = estado;
    if (estado === 'Inactivo') {
      for (const [k, v] of db.refreshTokens.entries()) {
        if (v.idUsuario === u.idUsuario) db.refreshTokens.delete(k);
      }
    }
    logBitacora(req.user.idUsuario, 'CAMBIO_ESTADO', 'usuarios', u.idUsuario);
    return res.json(toUsuarioResponse(u));
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/usuarios/:id/rol', requireRoles('Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    if (id === req.user.idUsuario) throw new ApiError('ROL_PROPIO_NO_MODIFICABLE');
    const u = db.usuarios.find((x) => x.idUsuario === id);
    if (!u) throw new ApiError('RECURSO_NO_ENCONTRADO');
    const { rol } = req.body || {};
    if (!['Administrador', 'Organizador', 'Participante'].includes(rol)) throw new ApiError('VALIDACION_FALLIDA');
    u.rol = rol;
    logBitacora(req.user.idUsuario, 'CAMBIO_ROL', 'usuarios', u.idUsuario);
    return res.json(toUsuarioResponse(u));
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/usuarios/:id/aprobacion', requireRoles('Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const u = db.usuarios.find((x) => x.idUsuario === id);
    if (!u) throw new ApiError('RECURSO_NO_ENCONTRADO');
    if (u.estadoCuenta !== 'Pendiente') throw new ApiError('CUENTA_NO_PENDIENTE');
    const { aprobar, motivo } = req.body || {};
    if (!aprobar && !String(motivo || '').trim()) throw new ApiError('MOTIVO_RECHAZO_REQUERIDO');

    if (aprobar) {
      u.rol = 'Organizador';
      u.estadoCuenta = 'Activo';
      pushNotification(u.idUsuario, null, 'Aprobacion_Organizador', 'Solicitud aprobada', 'Tu cuenta de Organizador fue aprobada. Ya puedes crear eventos.');
      logBitacora(req.user.idUsuario, 'APROBAR_ORGANIZADOR', 'usuarios', u.idUsuario);
    } else {
      u.rol = 'Participante';
      u.estadoCuenta = 'Activo';
      pushNotification(u.idUsuario, null, 'Rechazo_Organizador', 'Solicitud de organizador rechazada', `Tu solicitud fue rechazada: ${motivo.trim()}. Tu cuenta sigue activa como Participante.`);
      logBitacora(req.user.idUsuario, 'RECHAZAR_ORGANIZADOR', 'usuarios', u.idUsuario);
    }
    return res.json(toUsuarioResponse(u));
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/usuarios/exportar', requireRoles('Administrador'), (req, res) => {
  const { formato = 'pdf', buscar, rol, estado } = req.query;
  const lista = filterUsuarios({ buscar, rol, estado });
  logBitacora(req.user.idUsuario, 'EXPORTAR_USUARIOS', 'usuarios', null);
  return sendExport(
    res,
    formato,
    'usuarios',
    'SIGER · Directorio de usuarios',
    [`Generado: ${new Date().toISOString()}`, `Solicitado por: ${req.user.nombres} ${req.user.apellidos}`],
    [
      {
        titulo: 'Usuarios',
        columnas: ['Nombre', 'Correo', 'Rol', 'Estado'],
        filas: lista.map((u) => [`${u.nombres} ${u.apellidos}`, u.correoElectronico, u.rol, u.estadoCuenta]),
      },
    ],
  );
});

// ---------------------------------------------------------------------------
// NOTIFICACIONES (/api/v1/notificaciones*)
// ---------------------------------------------------------------------------
app.get('/api/v1/notificaciones', requireAuth, (req, res) => {
  const { leida, pagina = 1, limite = 10 } = req.query;
  const mias = db.notificaciones.filter((n) => n.idUsuario === req.user.idUsuario);
  const noLeidas = mias.filter((n) => !n.leida).length;
  let filtradas = mias;
  if (leida === 'true') filtradas = mias.filter((n) => n.leida);
  else if (leida === 'false') filtradas = mias.filter((n) => !n.leida);

  filtradas = [...filtradas].sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
  return res.json({
    notificaciones: paginate(filtradas, pagina, limite),
    noLeidas,
  });
});

app.patch('/api/v1/notificaciones/:id/leida', requireAuth, (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const n = db.notificaciones.find((x) => x.idNotificacion === id && x.idUsuario === req.user.idUsuario);
    if (!n) throw new ApiError('RECURSO_NO_ENCONTRADO');
    n.leida = true;
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/v1/notificaciones/leidas', requireAuth, (req, res) => {
  for (const n of db.notificaciones) {
    if (n.idUsuario === req.user.idUsuario) n.leida = true;
  }
  return res.status(204).end();
});

// ---------------------------------------------------------------------------
// SOPORTE TÉCNICO (/api/v1/soporte/tickets*)
// ---------------------------------------------------------------------------
app.post('/api/v1/soporte/tickets', optionalAuth, (req, res, next) => {
  try {
    const { correoContacto, tipo, descripcion } = req.body || {};
    const email = String(correoContacto || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email) || !['Incidente', 'Solicitud_Cambio', 'Consulta', 'Acceso'].includes(tipo) || !descripcion?.trim()) {
      throw new ApiError('VALIDACION_FALLIDA');
    }
    const s = {
      idSolicitud: db.seq.soporte++,
      idUsuario: req.user ? req.user.idUsuario : null,
      correoContacto: email,
      tipo,
      descripcion: descripcion.trim(),
      estado: 'Abierta',
      fechaCreacion: new Date().toISOString(),
    };
    db.solicitudesSoporte.unshift(s);
    return res.status(201).json(s);
  } catch (err) {
    return next(err);
  }
});

app.get('/api/v1/soporte/tickets', requireRoles('Administrador'), (req, res) => {
  const { estado, tipo, pagina = 1, limite = 10 } = req.query;
  let lista = [...db.solicitudesSoporte];
  if (estado) lista = lista.filter((s) => s.estado === estado);
  if (tipo) lista = lista.filter((s) => s.tipo === tipo);
  lista.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
  return res.json(paginate(lista, pagina, limite));
});

app.patch('/api/v1/soporte/tickets/:id/estado', requireRoles('Administrador'), (req, res, next) => {
  try {
    const id = parsePositiveId(req.params.id);
    const s = db.solicitudesSoporte.find((x) => x.idSolicitud === id);
    if (!s) throw new ApiError('RECURSO_NO_ENCONTRADO');
    if (s.estado === 'Cerrada') throw new ApiError('SOLICITUD_CERRADA');
    const { estado } = req.body || {};
    if (!['En_Proceso', 'Cerrada'].includes(estado)) throw new ApiError('VALIDACION_FALLIDA');
    s.estado = estado;
    return res.json(s);
  } catch (err) {
    return next(err);
  }
});

// 404 para rutas /api no encontradas
app.use('/api', (_req, _res, next) => next(new ApiError('RUTA_NO_ENCONTRADA')));

// Manejo uniforme de errores (incluye Multer file limit)
app.use((err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') return sendError(res, new ApiError('ARCHIVO_DEMASIADO_GRANDE'));
  return sendError(res, err);
});

// ---------------------------------------------------------------------------
// Servir SPA compilada desde frontend/dist (si no existe aún, compila en segundo plano sin bloquear el puerto 3000)
// ---------------------------------------------------------------------------
const distDir = path.join(__dirname, 'frontend', 'dist');
const distIndex = path.join(distDir, 'index.html');
let buildPromise = null;

function ensureFrontendBuilt() {
  if (fs.existsSync(distIndex)) return Promise.resolve();
  if (!buildPromise) {
    buildPromise = new Promise((resolve, reject) => {
      exec('npm --prefix frontend run build', { cwd: __dirname }, (err, _stdout, stderr) => {
        if (err) {
          console.error('Error compilando frontend:', stderr || err.message);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  return buildPromise;
}

if (!fs.existsSync(distIndex)) {
  ensureFrontendBuilt().catch(() => {});
}

const staticMiddleware = express.static(distDir);
app.use(async (req, res, next) => {
  try {
    await ensureFrontendBuilt();
    return staticMiddleware(req, res, next);
  } catch {
    return res.status(503).send('Error al compilar el frontend.');
  }
});

app.use((_req, res) => {
  res.sendFile(distIndex);
});

app.listen(PORT, HOST, () => {
  console.log(`SIGER server listening on http://${HOST}:${PORT}`);
});
