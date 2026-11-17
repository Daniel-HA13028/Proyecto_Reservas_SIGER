package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Crear o renombrar una categoría. */
@Schema(description = "Crear o renombrar una categoría.")
public record CategoriaRequest(
        @Schema(description = "Único.")
        @NotBlank
        @Size(max = 60)
        String nombre
) {
}
