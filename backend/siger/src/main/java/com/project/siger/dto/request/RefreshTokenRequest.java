package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

/** Renovación o cierre de sesión con el refresh token. */
@Schema(description = "Renovación o cierre de sesión con el refresh token.")
public record RefreshTokenRequest(
        @NotBlank
        String refreshToken
) {
}
