package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Aprobar o rechazar una solicitud de Organizador. */
@Schema(description = "Aprobar o rechazar una solicitud de Organizador.")
public record AprobacionOrganizadorRequest(
        @Schema(description = "true: Organizador Activo; false: Participante Activo.")
        @NotNull
        Boolean aprobar,

        @Schema(description = "Obligatorio al rechazar; se incluye en la notificación.")
        @Size(max = 300)
        String motivo
) {
}
