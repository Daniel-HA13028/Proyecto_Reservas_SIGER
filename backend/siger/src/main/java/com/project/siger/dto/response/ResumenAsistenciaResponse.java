package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.List;

/** Estadísticas de asistencia en vivo; el frontend la consulta cada 10 s. */
@Schema(description = "Estadísticas de asistencia en vivo; el frontend la consulta cada 10 s.")
public record ResumenAsistenciaResponse(
        Long idEvento,

        @Schema(description = "Reservaciones confirmadas.")
        int registrados,

        @Schema(description = "Registrados más acompañantes.")
        int personasEsperadas,

        int asistentes,

        double porcentajeAsistencia,

        List<IngresoIntervaloResponse> ingresosPorIntervalo,

        List<AsistenciaResponse> ultimosValidados,

        OffsetDateTime generadoEn
) {
}
