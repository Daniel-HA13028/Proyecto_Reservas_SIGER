package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

/** Tokens de sesión y datos del usuario autenticado. */
@Schema(description = "Tokens de sesión y datos del usuario autenticado.")
public record AuthResponse(
        @Schema(description = "JWT de 30 minutos.")
        String accessToken,

        @Schema(description = "Se guarda como hash en tokens_usuario.")
        String refreshToken,

        @Schema(description = "Siempre \"Bearer\".")
        String tipoToken,

        long expiraEnSegundos,

        UsuarioResponse usuario
) {
}
