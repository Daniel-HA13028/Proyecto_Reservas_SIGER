package com.project.siger.dto.response;
import io.swagger.v3.oas.annotations.media.Schema;

/** Rendimiento por categoría */
@Schema(description = "Rendimiento por categoría.")
public record ReporteCategoriaResponse(
        String categoria,

        long eventos,

        long reservaciones,

        long asistencias,

        double tasaAsistencia
) {
}
