package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Registro de la actividad reciente (bitácora). */
@Schema(description = "Registro de la actividad reciente (bitácora).")
public record ActividadResponse(
        OffsetDateTime fecha,

        String accion,

        String usuario,

        String entidad,

        Long idEntidad
) {
}
