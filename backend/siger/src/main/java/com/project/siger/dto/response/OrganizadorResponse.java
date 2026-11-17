package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

/** Contacto del organizador que se muestra en el detalle del evento. */
@Schema(description = "Contacto del organizador que se muestra en el detalle del evento.")
public record OrganizadorResponse(
        Long idUsuario,

        String nombreCompleto,

        String correoElectronico
) {
}
