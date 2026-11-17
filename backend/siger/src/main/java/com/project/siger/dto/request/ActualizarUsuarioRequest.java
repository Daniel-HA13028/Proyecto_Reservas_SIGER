package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Edición de los datos de un usuario por el Administrador */
@Schema(description = "Edición de los datos de un usuario por el Administrador.")
public record ActualizarUsuarioRequest(
        @NotBlank
        @Size(max = 100)
        String nombres,

        @NotBlank
        @Size(max = 100)
        String apellidos,

        @NotBlank
        @Email
        @Size(max = 150)
        String correoElectronico,

        @Past
        LocalDate fechaNacimiento
) {
}
