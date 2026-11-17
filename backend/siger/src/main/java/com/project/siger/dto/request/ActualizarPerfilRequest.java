package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Datos del perfil propio. */
@Schema(description = "Datos del perfil propio.")
public record ActualizarPerfilRequest(
        @NotBlank
        @Size(max = 100)
        String nombres,

        @NotBlank
        @Size(max = 100)
        String apellidos,

        @Schema(description = "Si cambia, el nuevo correo debe verificarse antes de reemplazar al anterior.")
        @NotBlank
        @Email
        @Size(max = 150)
        String correoElectronico,

        @Past
        LocalDate fechaNacimiento
) {
}
