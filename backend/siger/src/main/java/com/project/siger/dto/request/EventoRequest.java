package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Datos de un evento al crearlo o editarlo. Se envía como parte "datos" del multipart. */
@Schema(description = "Datos de un evento al crearlo o editarlo. Se envía como parte \"datos\" del multipart.")
public record EventoRequest(
        @NotBlank
        @Size(max = 150)
        String nombreEvento,

        @NotBlank
        String descripcion,

        @Schema(description = "Categoría activa.")
        @NotNull
        Short idCategoria,

        @Schema(description = "Posterior a la fecha actual.")
        @NotNull
        @Future
        OffsetDateTime fechaHoraInicio,

        @Schema(description = "Posterior al inicio.")
        @NotNull
        OffsetDateTime fechaHoraFin,

        @Schema(description = "Opcional; si no se envía es igual al inicio.")
        OffsetDateTime fechaLimiteReserva,

        @Schema(description = "Lugar físico o enlace de la plataforma virtual.")
        @NotBlank
        @Size(max = 200)
        String ubicacion,

        @Schema(description = "No puede quedar por debajo de los cupos reservado.")
        @NotNull
        @Positive
        Integer cupoMaximo,

        @NotNull
        @PositiveOrZero
        Short maxAcompanantes,

        @Schema(description = "US$ por persona; 0 = gratuito.")
        @NotNull
        @PositiveOrZero
        @Digits(integer = 8, fraction = 2)
        BigDecimal precio,

        @Schema(description = "Habilita el control de asistencia por QR.")
        @NotNull
        Boolean requiereQr
) {
}
