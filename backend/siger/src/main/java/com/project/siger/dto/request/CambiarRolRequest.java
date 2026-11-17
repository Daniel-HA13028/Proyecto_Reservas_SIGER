package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import com.project.siger.model.enums.Rol;

/** Cambio de rol por el Administrador. */
@Schema(description = "Cambio de rol por el Administrador.")
public record CambiarRolRequest(
        @NotNull
        Rol rol
) {
}
