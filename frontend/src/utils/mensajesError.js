// SIGER · Mensajes de error de la API en español (T-01-07).
// Mismos textos que CodigoError.java del backend; la interfaz los usa cuando la respuesta trae error.codigo.
export const MENSAJES_ERROR = {
  // Generales
  SOLICITUD_INVALIDA: "La solicitud no tiene un formato válido.",
  PARAMETRO_INVALIDO: "Uno de los parámetros tiene un valor no válido.",
  VALIDACION_FALLIDA: "Revisa los datos marcados en el formulario.",
  NO_AUTENTICADO: "Inicia sesión para continuar.",
  SESION_EXPIRADA: "Tu sesión expiró. Vuelve a iniciar sesión.",
  SIN_PERMISO: "No tienes permiso para realizar esta acción.",
  RECURSO_NO_ENCONTRADO: "No encontramos el recurso solicitado.",
  RUTA_NO_ENCONTRADA: "La dirección solicitada no existe.",
  METODO_NO_PERMITIDO: "Esta operación no está disponible para esta dirección.",
  CONFLICTO_DATOS: "La operación entra en conflicto con datos existentes.",
  RECURSO_EN_USO: "No se puede eliminar porque tiene información relacionada.",
  ARCHIVO_DEMASIADO_GRANDE: "La imagen supera el tamaño máximo de 2 MB.",
  DEMASIADAS_SOLICITUDES: "Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  ERROR_INTERNO: "Ocurrió un error inesperado. Inténtalo de nuevo más tarde.",
  NO_IMPLEMENTADO: "Esta función aún no está disponible.",
  // Autenticación y perfil (RF-01 a RF-04, RF-07)
  CREDENCIALES_INVALIDAS: "Correo o contraseña incorrectos.",
  CUENTA_PENDIENTE: "Tu cuenta de organizador está pendiente de aprobación por un administrador.",
  CUENTA_INACTIVA: "Tu cuenta está desactivada. Comunícate con soporte.",
  INTENTOS_EXCEDIDOS: "Por seguridad bloqueamos el acceso con este correo durante 15 minutos.",
  SESION_NO_VALIDA: "Tu sesión ya no es válida. Inicia sesión de nuevo.",
  CORREO_YA_REGISTRADO: "Ya existe una cuenta con este correo.",
  CONTRASENAS_NO_COINCIDEN: "La contraseña y su confirmación no coinciden.",
  CONTRASENA_ACTUAL_INCORRECTA: "La contraseña actual no es correcta.",
  ROL_NO_PERMITIDO_EN_REGISTRO: "Solo puedes registrarte como Participante u Organizador.",
  ENLACE_VERIFICACION_INVALIDO: "El enlace de verificación no es válido o ya se usó.",
  ENLACE_VERIFICACION_VENCIDO: "El enlace de verificación venció. Solicita uno nuevo.",
  CODIGO_INVALIDO: "El código no es correcto.",
  CODIGO_VENCIDO: "El código venció. Solicita uno nuevo.",
  CODIGO_INTENTOS_AGOTADOS: "Superaste los 5 intentos. Solicita un código nuevo.",
  // Usuarios (RF-05, RF-06)
  AUTODESACTIVACION_NO_PERMITIDA: "No puedes desactivar tu propia cuenta.",
  ROL_PROPIO_NO_MODIFICABLE: "No puedes cambiar tu propio rol.",
  ESTADO_CUENTA_NO_PERMITIDO: "El estado Pendiente solo se asigna al registrar un organizador.",
  CUENTA_NO_PENDIENTE: "La cuenta no tiene una solicitud de organizador pendiente.",
  MOTIVO_RECHAZO_REQUERIDO: "Indica el motivo del rechazo.",
  // Categorías (RF-26)
  CATEGORIA_DUPLICADA: "Ya existe una categoría con ese nombre.",
  CATEGORIA_INACTIVA: "La categoría seleccionada está inactiva.",
  // Eventos (RF-08 a RF-10)
  FECHAS_EVENTO_INVALIDAS: "La fecha de fin debe ser posterior al inicio y la fecha límite no puede ser posterior al inicio.",
  CAPACIDAD_MENOR_A_RESERVADOS: "La capacidad no puede ser menor que los cupos ya reservados.",
  EVENTO_NO_EDITABLE: "Un evento cancelado o finalizado no se puede modificar.",
  EVENTO_NO_PUBLICABLE: "Solo se pueden publicar eventos en borrador.",
  EVENTO_YA_CANCELADO: "El evento ya está cancelado.",
  EVENTO_NO_ELIMINABLE: "Solo se pueden eliminar eventos en borrador sin reservaciones.",
  NO_ES_PROPIETARIO: "Solo el organizador del evento o un administrador pueden hacer esta acción.",
  IMAGEN_INVALIDA: "La imagen debe ser JPG o PNG.",
  // Reservaciones (RF-13 a RF-16)
  EVENTO_NO_DISPONIBLE: "Este evento no acepta reservaciones en este momento.",
  CUPO_AGOTADO: "No hay cupos suficientes para ti y tus acompañantes.",
  RESERVA_DUPLICADA: "Ya tienes una reservación confirmada para este evento.",
  ACOMPANANTES_EXCEDIDOS: "Superaste el número máximo de acompañantes del evento.",
  CANCELACION_FUERA_DE_PLAZO: "Solo puedes cancelar hasta 24 horas antes del inicio del evento.",
  RESERVACION_YA_CANCELADA: "La reservación ya está cancelada.",
  // Asistencia (RF-17 a RF-19)
  CODIGO_QR_INVALIDO: "El código no corresponde a ninguna reservación.",
  QR_DE_OTRO_EVENTO: "El comprobante pertenece a otro evento.",
  RESERVACION_NO_CONFIRMADA: "La reservación está cancelada; no se puede registrar la asistencia.",
  ASISTENCIA_YA_REGISTRADA: "Asistencia ya registrada.",
  DESHACER_FUERA_DE_PLAZO: "Solo puedes deshacer una asistencia el mismo día del evento.",
  ASISTENCIA_NO_REGISTRADA: "La reservación no tiene asistencia registrada.",
  // Reportes (RF-23, RF-24)
  PERIODO_INVALIDO: "La fecha inicial no puede ser posterior a la final.",
  REPORTE_REQUIERE_REFERENCIA: "Selecciona el evento u organizador del reporte.",
  // Soporte técnico (RF-25)
  SOLICITUD_CERRADA: "La solicitud ya está cerrada.",
};

/** Mensaje para mostrar a partir de una respuesta de error de axios. */
export function mensajeDeError(error) {
  const datos = error?.response?.data?.error;
  if (!datos) return error?.request ? 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.' : MENSAJES_ERROR.ERROR_INTERNO;
  return datos.mensaje || MENSAJES_ERROR[datos.codigo] || MENSAJES_ERROR.ERROR_INTERNO;
}
