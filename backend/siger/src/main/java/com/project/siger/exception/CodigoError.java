package com.project.siger.exception;

import org.springframework.http.HttpStatus;

/**
 * Catálogo de códigos de error de la API. El código viaja en ErrorResponse.error.codigo
 * y el frontend muestra el mensaje en español (src/utils/mensajesError.js usa los mismos textos).
 */
public enum CodigoError {

    // ---- Generales
    /** JSON mal formado o valor no permitido en un campo. */
    SOLICITUD_INVALIDA(HttpStatus.BAD_REQUEST, "La solicitud no tiene un formato válido."),
    /** Tipo o valor incorrecto en la ruta o en la consulta. */
    PARAMETRO_INVALIDO(HttpStatus.BAD_REQUEST, "Uno de los parámetros tiene un valor no válido."),
    /** Bean Validation; detalles por campo. */
    VALIDACION_FALLIDA(HttpStatus.UNPROCESSABLE_ENTITY, "Revisa los datos marcados en el formulario."),
    /** Falta el token (RNF-02). */
    NO_AUTENTICADO(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar."),
    /** Access token vencido o inválido. */
    SESION_EXPIRADA(HttpStatus.UNAUTHORIZED, "Tu sesión expiró. Vuelve a iniciar sesión."),
    /** Rol sin acceso (RNF-02). */
    SIN_PERMISO(HttpStatus.FORBIDDEN, "No tienes permiso para realizar esta acción."),
    /** Id inexistente. */
    RECURSO_NO_ENCONTRADO(HttpStatus.NOT_FOUND, "No encontramos el recurso solicitado."),
    /** Ruta de la API inexistente. */
    RUTA_NO_ENCONTRADA(HttpStatus.NOT_FOUND, "La dirección solicitada no existe."),
    /** Método HTTP no soportado. */
    METODO_NO_PERMITIDO(HttpStatus.METHOD_NOT_ALLOWED, "Esta operación no está disponible para esta dirección."),
    /** Restricción de la base de datos sin código propio. */
    CONFLICTO_DATOS(HttpStatus.CONFLICT, "La operación entra en conflicto con datos existentes."),
    /** Llave foránea con ON DELETE RESTRICT */
    RECURSO_EN_USO(HttpStatus.CONFLICT, "No se puede eliminar porque tiene información relacionada."),
    /** Imagen del evento */
    ARCHIVO_DEMASIADO_GRANDE(HttpStatus.PAYLOAD_TOO_LARGE, "La imagen supera el tamaño máximo de 2 MB."),
    /** Límite de Bucket4j. */
    DEMASIADAS_SOLICITUDES(HttpStatus.TOO_MANY_REQUESTS, "Hiciste demasiados intentos. Espera unos minutos e inténtalo de nuevo."),
    /** Error no controlado (se registra en el log). */
    ERROR_INTERNO(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado. Inténtalo de nuevo más tarde."),
    /** Esqueleto del contrato (temporal, hasta su fase). */
    NO_IMPLEMENTADO(HttpStatus.NOT_IMPLEMENTED, "Esta función aún no está disponible."),

    // ---- Autenticación y perfil
    /** mensaje genérico, no indica cuál dato falló. */
    CREDENCIALES_INVALIDAS(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos."),
    /**  */
    CUENTA_PENDIENTE(HttpStatus.FORBIDDEN, "Tu cuenta de organizador está pendiente de aprobación por un administrador."),
    /** RN-13. */
    CUENTA_INACTIVA(HttpStatus.FORBIDDEN, "Tu cuenta está desactivada. Comunícate con soporte."),
    /** 5 intentos fallidos  */
    INTENTOS_EXCEDIDOS(HttpStatus.TOO_MANY_REQUESTS, "Por seguridad bloqueamos el acceso con este correo durante 15 minutos."),
    /** Refresh token inválido, vencido o revocado. */
    SESION_NO_VALIDA(HttpStatus.UNAUTHORIZED, "Tu sesión ya no es válida. Inicia sesión de nuevo."),
    /**  */
    CORREO_YA_REGISTRADO(HttpStatus.CONFLICT, "Ya existe una cuenta con este correo."),
    /**  */
    CONTRASENAS_NO_COINCIDEN(HttpStatus.UNPROCESSABLE_ENTITY, "La contraseña y su confirmación no coinciden."),
    /**  */
    CONTRASENA_ACTUAL_INCORRECTA(HttpStatus.UNPROCESSABLE_ENTITY, "La contraseña actual no es correcta."),
    /**  */
    ROL_NO_PERMITIDO_EN_REGISTRO(HttpStatus.UNPROCESSABLE_ENTITY, "Solo puedes registrarte como Participante u Organizador."),
    /**  */
    ENLACE_VERIFICACION_INVALIDO(HttpStatus.UNPROCESSABLE_ENTITY, "El enlace de verificación no es válido o ya se usó."),
    /**  */
    ENLACE_VERIFICACION_VENCIDO(HttpStatus.UNPROCESSABLE_ENTITY, "El enlace de verificación venció. Solicita uno nuevo."),
    /**  */
    CODIGO_INVALIDO(HttpStatus.UNPROCESSABLE_ENTITY, "El código no es correcto."),
    /** 15 minutos. */
    CODIGO_VENCIDO(HttpStatus.UNPROCESSABLE_ENTITY, "El código venció. Solicita uno nuevo."),
    /**  */
    CODIGO_INTENTOS_AGOTADOS(HttpStatus.UNPROCESSABLE_ENTITY, "Superaste los 5 intentos. Solicita un código nuevo."),

    // ---- Usuarios 
    /**  */
    AUTODESACTIVACION_NO_PERMITIDA(HttpStatus.CONFLICT, "No puedes desactivar tu propia cuenta."),
    ROL_PROPIO_NO_MODIFICABLE(HttpStatus.CONFLICT, "No puedes cambiar tu propio rol."),
    /** */
    ESTADO_CUENTA_NO_PERMITIDO(HttpStatus.UNPROCESSABLE_ENTITY, "El estado Pendiente solo se asigna al registrar un organizador."),
    /** */
    CUENTA_NO_PENDIENTE(HttpStatus.CONFLICT, "La cuenta no tiene una solicitud de organizador pendiente."),
    /**  */
    MOTIVO_RECHAZO_REQUERIDO(HttpStatus.UNPROCESSABLE_ENTITY, "Indica el motivo del rechazo."),

    // ---- Categorías
    /**  */
    CATEGORIA_DUPLICADA(HttpStatus.CONFLICT, "Ya existe una categoría con ese nombre."),
    /**  */
    CATEGORIA_INACTIVA(HttpStatus.UNPROCESSABLE_ENTITY, "La categoría seleccionada está inactiva."),

    // ---- Eventos 
    /**  */
    FECHAS_EVENTO_INVALIDAS(HttpStatus.UNPROCESSABLE_ENTITY, "La fecha de fin debe ser posterior al inicio y la fecha límite no puede ser posterior al inicio."),
    /**  */
    CAPACIDAD_MENOR_A_RESERVADOS(HttpStatus.CONFLICT, "La capacidad no puede ser menor que los cupos ya reservados."),
    /**  */
    EVENTO_NO_EDITABLE(HttpStatus.CONFLICT, "Un evento cancelado o finalizado no se puede modificar."),
    /**  */
    EVENTO_NO_PUBLICABLE(HttpStatus.CONFLICT, "Solo se pueden publicar eventos en borrador."),
    /**  */
    EVENTO_YA_CANCELADO(HttpStatus.CONFLICT, "El evento ya está cancelado."),
    /**  */
    EVENTO_NO_ELIMINABLE(HttpStatus.CONFLICT, "Solo se pueden eliminar eventos en borrador sin reservaciones."),
    /** */
    NO_ES_PROPIETARIO(HttpStatus.FORBIDDEN, "Solo el organizador del evento o un administrador pueden hacer esta acción."),
    /**  */
    IMAGEN_INVALIDA(HttpStatus.UNPROCESSABLE_ENTITY, "La imagen debe ser JPG o PNG."),

    // ---- Reservaciones 
    /**  */
    EVENTO_NO_DISPONIBLE(HttpStatus.CONFLICT, "Este evento no acepta reservaciones en este momento."),
    /**  */
    CUPO_AGOTADO(HttpStatus.CONFLICT, "No hay cupos suficientes para ti y tus acompañantes."),
    /**  */
    RESERVA_DUPLICADA(HttpStatus.CONFLICT, "Ya tienes una reservación confirmada para este evento."),
    /**  */
    ACOMPANANTES_EXCEDIDOS(HttpStatus.UNPROCESSABLE_ENTITY, "Superaste el número máximo de acompañantes del evento."),
    /**  */
    CANCELACION_FUERA_DE_PLAZO(HttpStatus.UNPROCESSABLE_ENTITY, "Solo puedes cancelar hasta 24 horas antes del inicio del evento."),
    /**  */
    RESERVACION_YA_CANCELADA(HttpStatus.CONFLICT, "La reservación ya está cancelada."),

    // ---- Asistencia 
    /** paso 1. */
    CODIGO_QR_INVALIDO(HttpStatus.NOT_FOUND, "El código no corresponde a ninguna reservación."),
    /** paso 2. */
    QR_DE_OTRO_EVENTO(HttpStatus.CONFLICT, "El comprobante pertenece a otro evento."),
    /** paso 3. */
    RESERVACION_NO_CONFIRMADA(HttpStatus.CONFLICT, "La reservación está cancelada; no se puede registrar la asistencia."),
    /** paso 4. */
    ASISTENCIA_YA_REGISTRADA(HttpStatus.CONFLICT, "Asistencia ya registrada."),
    /**  */
    DESHACER_FUERA_DE_PLAZO(HttpStatus.CONFLICT, "Solo puedes deshacer una asistencia el mismo día del evento."),
    /**  */
    ASISTENCIA_NO_REGISTRADA(HttpStatus.NOT_FOUND, "La reservación no tiene asistencia registrada."),

    // ---- Reportes 
    /** */
    PERIODO_INVALIDO(HttpStatus.UNPROCESSABLE_ENTITY, "La fecha inicial no puede ser posterior a la final."),
    /** */
    REPORTE_REQUIERE_REFERENCIA(HttpStatus.UNPROCESSABLE_ENTITY, "Selecciona el evento u organizador del reporte."),

    // ---- Soporte técnico 
    /** una solicitud cerrada ya no cambia de estado. */
    SOLICITUD_CERRADA(HttpStatus.CONFLICT, "La solicitud ya está cerrada.");

    private final HttpStatus estado;
    private final String mensaje;

    CodigoError(HttpStatus estado, String mensaje) {
        this.estado = estado;
        this.mensaje = mensaje;
    }

    public HttpStatus getEstado() {
        return estado;
    }

    public String getMensaje() {
        return mensaje;
    }
}
