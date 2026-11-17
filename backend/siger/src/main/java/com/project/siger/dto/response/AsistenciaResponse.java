package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.MetodoValidacion;

/** Asistencia registrada. */
@Schema(description = "Asistencia registrada.")
public record AsistenciaResponse(
        Long idAsistencia,

        Long idReservacion,

        String participante,

        Integer acompanantes,

        OffsetDateTime fechaHoraValidacion,

        MetodoValidacion metodoValidacion,

        String registradoPor
) {
}
