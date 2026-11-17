package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import com.project.siger.model.enums.TipoSolicitudSoporte;

/** Reporte de un problema desde Soporte técnico. */
@Schema(description = "Reporte de un problema desde Soporte técnico.")
public record CrearSolicitudSoporteRequest(
        @NotBlank
        @Email
        @Size(max = 150)
        String correoContacto,

        @NotNull
        TipoSolicitudSoporte tipo,

        @NotBlank
        @Size(max = 2000)
        String descripcion
) {
}
