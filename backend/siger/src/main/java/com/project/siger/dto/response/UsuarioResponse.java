package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.model.enums.Rol;

/** Datos de un usuario (perfil y Gestión de Usuarios). */
@Schema(description = "Datos de un usuario (perfil y Gestión de Usuarios).")
public record UsuarioResponse(
        Long idUsuario,

        String nombres,

        String apellidos,

        String correoElectronico,

        LocalDate fechaNacimiento,

        Rol rol,

        EstadoCuenta estadoCuenta,

        boolean correoVerificado,

        OffsetDateTime fechaRegistro,

        OffsetDateTime ultimoAcceso
) {
}
