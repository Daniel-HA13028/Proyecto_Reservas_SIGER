package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import com.project.siger.model.enums.EstadoSolicitudSoporte;

/** Atención de una solicitud de soporte. */
@Schema(description = "Atención de una solicitud de soporte.")
public record CambiarEstadoSolicitudRequest(
        @NotNull
        EstadoSolicitudSoporte estado
) {
}
