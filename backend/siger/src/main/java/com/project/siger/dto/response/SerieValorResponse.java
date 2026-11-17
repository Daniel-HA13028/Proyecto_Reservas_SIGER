package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

/** Punto de una serie para gráficos (etiqueta y valor). */
@Schema(description = "Punto de una serie para gráficos (etiqueta y valor).")
public record SerieValorResponse(
        @Schema(description = "Por ejemplo \"2026-09\" o el nombre de una categoría.")
        String etiqueta,

        double valor
) {
}
