package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.EstadoReservacion;

/** Reservación con los datos del comprobante. */
@Schema(description = "Reservación con los datos del comprobante.")
public record ReservacionResponse(
        Long idReservacion,

        EventoResumenResponse evento,

        Integer acompanantes,

        String observaciones,

        @Schema(description = "precio × (1 + acompanantes); pago simulado.")
        BigDecimal monto,

        @Schema(description = "Contenido del QR.")
        String codigoComprobante,

        EstadoReservacion estadoReservacion,

        OffsetDateTime fechaReservacion,

        OffsetDateTime fechaCancelacion,

        boolean asistio,

        @Schema(description = "Confirmada y a más de 24 h del inicio.")
        boolean cancelable
) {
}
