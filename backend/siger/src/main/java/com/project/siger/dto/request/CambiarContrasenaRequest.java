package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Cambio de contraseña desde el perfil. */
@Schema(description = "Cambio de contraseña desde el perfil.")
public record CambiarContrasenaRequest(
        @NotBlank
        String contrasenaActual,

        @NotBlank
        @Pattern(regexp = Validaciones.CONTRASENA, message = Validaciones.CONTRASENA_MENSAJE)
        String nuevaContrasena,

        @NotBlank
        String confirmacionContrasena
) {
}
