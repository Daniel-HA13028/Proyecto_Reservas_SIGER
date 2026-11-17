package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Dashboard del Participante. */
@Schema(description = "Dashboard del Participante.")
public record DashboardParticipanteResponse(
        List<ReservacionResponse> proximasReservaciones,

        long eventosAsistidos,

        @Schema(description = "Por las categorías de sus reservaciones anteriores.")
        List<EventoResumenResponse> eventosRecomendados
) {
}
