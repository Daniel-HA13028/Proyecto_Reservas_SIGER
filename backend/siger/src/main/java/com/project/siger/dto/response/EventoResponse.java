package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.EstadoEvento;

/** Detalle completo de un evento. */
@Schema(description = "Detalle completo de un evento.")
public record EventoResponse(
        Long idEvento,

        String nombreEvento,

        String descripcion,

        Short idCategoria,

        String categoria,

        OffsetDateTime fechaHoraInicio,

        OffsetDateTime fechaHoraFin,

        OffsetDateTime fechaLimiteReserva,

        String ubicacion,

        Integer cupoMaximo,

        Integer cupoDisponible,

        boolean lleno,

        Short maxAcompanantes,

        BigDecimal precio,

        String imagenUrl,

        boolean requiereQr,

        EstadoEvento estadoEvento,

        boolean reprogramado,

        String motivoCancelacion,

        @Schema(description = "Publicado, dentro de la fecha límite y con cupo (RN-01, RN-08); habilita el botón Reservar.")
        boolean aceptaReservaciones,

        OrganizadorResponse organizador,

        OffsetDateTime fechaCreacion,

        OffsetDateTime fechaActualizacion
) {
}
