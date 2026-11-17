package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Página de resultados. Las páginas empiezan en 1. */
@Schema(description = "Página de resultados. Las páginas empiezan en 1.")
public record PageResponse<T>(
        List<T> contenido,
        @Schema(description = "Número de página (desde 1).") int pagina,
        @Schema(description = "Elementos por página.") int limite,
        int totalPaginas,
        long totalElementos
) {
}
