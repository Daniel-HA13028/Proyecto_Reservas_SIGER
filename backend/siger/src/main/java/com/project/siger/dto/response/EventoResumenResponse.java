package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.EstadoEvento;

/** Tarjeta de evento para el catálogo y los listados. */
@Schema(description = "Tarjeta de evento para el catálogo y los listados.")
public record EventoResumenResponse(
        Long idEvento,

        String nombreEvento,

        Short idCategoria,

        String categoria,

        OffsetDateTime fechaHoraInicio,

        OffsetDateTime fechaHoraFin,

        String ubicacion,

        Integer cupoMaximo,

        Integer cupoDisponible,

        @Schema(description = "cupoDisponible = 0 (no se almacena).")
        boolean lleno,

        BigDecimal precio,

        String imagenUrl,

        EstadoEvento estadoEvento,

        boolean reprogramado
) {
}
