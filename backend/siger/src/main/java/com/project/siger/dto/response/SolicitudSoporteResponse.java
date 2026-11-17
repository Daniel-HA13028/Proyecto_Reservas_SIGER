package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.EstadoSolicitudSoporte;
import com.project.siger.model.enums.TipoSolicitudSoporte;

/** Solicitud de soporte registrada. */
@Schema(description = "Solicitud de soporte registrada.")
public record SolicitudSoporteResponse(
        Long idSolicitud,

        Long idUsuario,

        String correoContacto,

        TipoSolicitudSoporte tipo,

        String descripcion,

        EstadoSolicitudSoporte estado,

        OffsetDateTime fechaCreacion
) {
}
