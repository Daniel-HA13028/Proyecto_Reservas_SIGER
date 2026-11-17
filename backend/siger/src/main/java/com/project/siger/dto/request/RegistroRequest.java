package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import com.project.siger.model.enums.Rol;

/** Registro de una cuenta nueva. */
@Schema(description = "Registro de una cuenta nueva.")
public record RegistroRequest(
        @NotBlank
        @Size(max = 100)
        String nombres,

        @NotBlank
        @Size(max = 100)
        String apellidos,

        @Schema(description = "Credencial de inicio de sesión; se guarda en minúsculas.")
        @NotBlank
        @Email
        @Size(max = 150)
        String correoElectronico,

        @NotNull
        @Past
        LocalDate fechaNacimiento,

        @Schema(description = "Participante u Organizador; el Organizador queda Pendiente hasta que un Administrador lo apruebe.")
        @NotNull
        Rol rol,

        @NotBlank
        @Pattern(regexp = Validaciones.CONTRASENA, message = Validaciones.CONTRASENA_MENSAJE)
        String contrasena,

        @Schema(description = "Debe coincidir con contrasena.")
        @NotBlank
        String confirmacionContrasena,

        @AssertTrue(message = "Debe aceptar los Términos y Condiciones y la Política de Privacidad")
        boolean aceptaTerminos
) {
}
