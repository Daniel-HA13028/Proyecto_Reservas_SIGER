package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Reservación de cupo. */
@Schema(description = "Reservación de cupo.")
public record CrearReservacionRequest(
        @Schema(description = "Hasta eventos.maxAcompanantes; cupos = 1 + acompanantes (RN-01).")
        @NotNull
        @PositiveOrZero
        Integer acompanantes,

        @Size(max = 300)
        String observaciones
) {
}
