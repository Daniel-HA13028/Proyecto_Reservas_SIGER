package com.project.siger.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.request.ActualizarPerfilRequest;
import com.project.siger.dto.request.CambiarContrasenaRequest;
import com.project.siger.dto.response.UsuarioResponse;
import com.project.siger.service.PerfilService;

/**
 * Perfil del usuario autenticado.
 * Cualquier usuario autenticado gestiona solo su propio perfil.
 */
@RestController
@RequestMapping("/api/v1/perfil")
@PreAuthorize("isAuthenticated()")
@Tag(name = "Perfil", description = "Perfil del usuario autenticado.")
public class PerfilController {

    private final PerfilService perfilService;

    public PerfilController(PerfilService perfilService) {
        this.perfilService = perfilService;
    }

    @GetMapping
    @Operation(summary = "Ver mi perfil",
            description = "Autenticado.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<UsuarioResponse> obtener(@Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo) {
        return ResponseEntity.ok(perfilService.obtener(yo.id()));
    }

    @PutMapping
    @Operation(summary = "Editar mi perfil",
            description = "Autenticado. Si cambia el correo, se envía un enlace de verificación al nuevo y el correo actual se mantiene hasta confirmarlo.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<UsuarioResponse> actualizar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Valid @RequestBody ActualizarPerfilRequest solicitud
    ) {
        return ResponseEntity.ok(perfilService.actualizar(yo.id(), solicitud));
    }

    @PutMapping("/contrasena")
    @Operation(summary = "Cambiar mi contraseña",
            description = "Autenticado. Requiere la contraseña actual.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> cambiarContrasena(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Valid @RequestBody CambiarContrasenaRequest solicitud
    ) {
        perfilService.cambiarContrasena(yo.id(), solicitud);
        return ResponseEntity.noContent().build();
    }
}
