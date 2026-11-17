package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Indicadores de un evento dentro de un reporte */
@Schema(description = "Indicadores de un evento dentro de un reporte.")
public record ReporteEventoResponse(
        Long idEvento,

        String nombreEvento,

        OffsetDateTime fechaHoraInicio,

        String categoria,

        Integer cupoMaximo,

        long reservaciones,

        long asistencias,

        double tasaAsistencia,

        BigDecimal ingresos
) {
}
