package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Inicio de sesión con correo y contraseña. */
@Schema(description = "Inicio de sesión con correo y contraseña.")
public record LoginRequest(
        @NotBlank
        @Email
        String correoElectronico,

        @NotBlank
        String contrasena,

        @Schema(description = "Si es true, el refresh token dura más.")
        boolean recordarme
) {
}
