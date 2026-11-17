package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

/** Notificaciones del usuario y contador de no leídas. */
@Schema(description = "Notificaciones del usuario y contador de no leídas.")
public record NotificacionesResponse(
        PageResponse<NotificacionResponse> notificaciones,

        @Schema(description = "Número que muestra el ícono de la barra superior.")
        long noLeidas
) {
}
