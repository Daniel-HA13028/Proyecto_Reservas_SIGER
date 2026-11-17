package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Reservación reciente en un evento del organizador. */
@Schema(description = "Reservación reciente en un evento del organizador.")
public record ReservacionRecienteResponse(
        Long idReservacion,

        String nombreEvento,

        String participante,

        Integer acompanantes,

        OffsetDateTime fechaReservacion
) {
}
