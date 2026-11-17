package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/** Token del enlace enviado al correo. */
@Schema(description = "Token del enlace enviado al correo.")
public record VerificarCorreoRequest(
        @NotBlank
        String token
) {
}
