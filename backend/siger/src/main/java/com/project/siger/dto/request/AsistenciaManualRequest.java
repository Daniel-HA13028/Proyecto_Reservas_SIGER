package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Marcado manual desde la lista de participantes. */
@Schema(description = "Marcado manual desde la lista de participantes.")
public record AsistenciaManualRequest(
        @NotNull
        Long idReservacion
) {
}
