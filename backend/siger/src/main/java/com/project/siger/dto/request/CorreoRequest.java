package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Correo para reenviar la verificación o iniciar la recuperación de contraseña. */
@Schema(description = "Correo para reenviar la verificación o iniciar la recuperación de contraseña.")
public record CorreoRequest(
        @NotBlank
        @Email
        String correoElectronico
) {
}
