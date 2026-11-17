package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Cancelación de un evento. */
@Schema(description = "Cancelación de un evento.")
public record CancelarEventoRequest(
        @Schema(description = "Se envía a los participantes.")
        @NotBlank
        @Size(max = 300)
        String motivo
) {
}
