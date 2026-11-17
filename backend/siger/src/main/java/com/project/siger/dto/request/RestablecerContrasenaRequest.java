package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Paso 3 de la recuperación: nueva contraseña. */
@Schema(description = "Paso 3 de la recuperación: nueva contraseña.")
public record RestablecerContrasenaRequest(
        @NotBlank
        @Email
        String correoElectronico,

        @Schema(description = "El mismo código del paso 2; se marca como usado.")
        @NotBlank
        @Pattern(regexp = Validaciones.CODIGO_6_DIGITOS)
        String codigo,

        @NotBlank
        @Pattern(regexp = Validaciones.CONTRASENA, message = Validaciones.CONTRASENA_MENSAJE)
        String nuevaContrasena,

        @NotBlank
        String confirmacionContrasena
) {
}
