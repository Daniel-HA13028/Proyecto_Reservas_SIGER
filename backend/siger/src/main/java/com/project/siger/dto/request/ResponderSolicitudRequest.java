package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Respuesta del administrador a una solicitud de soporte; se envía por correo a quien la reportó. */
@Schema(description = "Respuesta del administrador a una solicitud de soporte.")
public record ResponderSolicitudRequest(
        @Schema(description = "Texto de la respuesta. Se envía con la firma «Equipo Soporte SIGER».")
        @NotBlank
        @Size(max = 5000)
        String mensaje,

        @Schema(description = "Si es true, la solicitud queda Cerrada; si no, pasa a En_Proceso.")
        boolean cerrar
) {
}
