package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.TipoNotificacion;

/** Notificación del centro de notificaciones. */
@Schema(description = "Notificación del centro de notificaciones.")
public record NotificacionResponse(
        Long idNotificacion,

        TipoNotificacion tipo,

        String asunto,

        String mensaje,

        Long idEvento,

        boolean leida,

        OffsetDateTime fechaCreacion
) {
}
