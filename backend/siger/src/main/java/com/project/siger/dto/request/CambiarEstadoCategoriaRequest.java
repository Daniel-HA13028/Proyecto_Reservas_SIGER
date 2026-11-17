package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Activar o desactivar una categoría. */
@Schema(description = "Activar o desactivar una categoría.")
public record CambiarEstadoCategoriaRequest(
        @NotNull
        Boolean activa
) {
}
