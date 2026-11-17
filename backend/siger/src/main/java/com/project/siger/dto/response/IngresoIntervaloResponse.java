package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Ingresos registrados en un intervalo de 10 minutos. */
@Schema(description = "Ingresos registrados en un intervalo de 10 minutos.")
public record IngresoIntervaloResponse(
        OffsetDateTime inicio,

        int cantidad
) {
}
