package com.project.siger.exception;

import java.util.Locale;
import java.util.Map;

/**
 * Traduce el nombre de una restricción de PostgreSQL al código de error.
 * Las llaves foráneas sin entrada propia indican que el registro tiene información relacionada
 */
public final class RestriccionBd {

    private static final Map<String, CodigoError> CODIGOS = Map.ofEntries(
            Map.entry("uq_usuarios_correo_electronico", CodigoError.CORREO_YA_REGISTRADO),
            Map.entry("ck_usuarios_correo_minusculas", CodigoError.VALIDACION_FALLIDA),
            Map.entry("uq_categorias_nombre", CodigoError.CATEGORIA_DUPLICADA),
            Map.entry("ck_eventos_fecha_hora_fin", CodigoError.FECHAS_EVENTO_INVALIDAS),
            Map.entry("ck_eventos_fecha_limite_reserva", CodigoError.FECHAS_EVENTO_INVALIDAS),
            Map.entry("ck_eventos_cupo_disponible", CodigoError.CUPO_AGOTADO),
            Map.entry("ck_eventos_motivo_cancelacion", CodigoError.VALIDACION_FALLIDA),
            Map.entry("uq_reservaciones_confirmada", CodigoError.RESERVA_DUPLICADA),
            Map.entry("uq_asistencias_reservacion_vigente", CodigoError.ASISTENCIA_YA_REGISTRADA)
    );

    private RestriccionBd() {
    }

    /** Busca el nombre de una restricción conocida dentro del mensaje de la excepción de la base de datos. */
    public static CodigoError desdeMensaje(String mensaje) {
        if (mensaje == null) {
            return CodigoError.CONFLICTO_DATOS;
        }
        String texto = mensaje.toLowerCase(Locale.ROOT);
        for (Map.Entry<String, CodigoError> e : CODIGOS.entrySet()) {
            if (texto.contains(e.getKey())) {
                return e.getValue();
            }
        }
        return texto.contains("fk_") ? CodigoError.RECURSO_EN_USO : CodigoError.CONFLICTO_DATOS;
    }
}
