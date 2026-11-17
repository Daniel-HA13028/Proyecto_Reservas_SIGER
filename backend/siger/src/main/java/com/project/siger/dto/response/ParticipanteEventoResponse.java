package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.EstadoReservacion;
import com.project.siger.model.enums.MetodoValidacion;

/** Fila de la lista de participantes de un evento. */
@Schema(description = "Fila de la lista de participantes de un evento.")
public record ParticipanteEventoResponse(
        Long idReservacion,

        Long idParticipante,

        String nombreCompleto,

        String correoElectronico,

        Integer acompanantes,

        EstadoReservacion estadoReservacion,

        boolean asistio,

        OffsetDateTime fechaHoraValidacion,

        MetodoValidacion metodoValidacion,

        @Schema(description = "La marca se puede deshacer (solo el mismo día del evento).")
        boolean deshacible
) {
}
