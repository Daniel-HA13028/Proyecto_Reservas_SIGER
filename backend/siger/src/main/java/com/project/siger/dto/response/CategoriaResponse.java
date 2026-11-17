package com.project.siger.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

/** Categoría de eventos */
@Schema(description = "Categoría de eventos.")
public record CategoriaResponse(
        Short idCategoria,

        String nombre,

        boolean activa,

        OffsetDateTime fechaCreacion,

        @Schema(description = "Solo en la vista del Administrador (?todas=true).")
        @JsonInclude(JsonInclude.Include.NON_NULL)
        Long totalEventos
) {
}
