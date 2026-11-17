package com.project.siger.dto.request;

import com.project.siger.model.enums.EstadoCuenta;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Activar o desactivar una cuenta. */
@Schema(description = "Activar o desactivar una cuenta.")
public record CambiarEstadoUsuarioRequest(
        @Schema(description = "Activo o Inactivo. Pendiente solo se resuelve con /aprobacion.")
        @NotNull
        EstadoCuenta estado
) {
}
