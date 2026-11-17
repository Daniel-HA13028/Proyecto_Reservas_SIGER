package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Paso 2 de la recuperación: código de 6 dígitos. */
@Schema(description = "Paso 2 de la recuperación: código de 6 dígitos.")
public record VerificarCodigoRequest(
        @NotBlank
        @Email
        String correoElectronico,

        @NotBlank
        @Pattern(regexp = Validaciones.CODIGO_6_DIGITOS)
        String codigo
) {
}
