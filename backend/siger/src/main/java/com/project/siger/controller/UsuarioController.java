package com.project.siger.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.request.ActualizarUsuarioRequest;
import com.project.siger.dto.request.AprobacionOrganizadorRequest;
import com.project.siger.dto.request.CambiarEstadoUsuarioRequest;
import com.project.siger.dto.request.CambiarRolRequest;
import com.project.siger.dto.request.CrearUsuarioRequest;
import com.project.siger.dto.FormatoExportacion;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.UsuarioResponse;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.model.enums.Rol;
import com.project.siger.service.ExportadorTabla;
import com.project.siger.service.UsuarioService;

/**
 * Gestión de usuarios por el Administrador.
 * Solo el Administrador (RN-05); SecurityConfig lo exige también por ruta.
 */
@RestController
@RequestMapping("/api/v1/usuarios")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Tag(name = "Usuarios", description = "Gestión de usuarios por el Administrador.")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    @Operation(summary = "Listar usuarios",
            description = "Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<PageResponse<UsuarioResponse>> listar(
            @Parameter(description = "Texto en nombres, apellidos o correo.") @RequestParam(required = false) String buscar,
            @Parameter(description = "rol") @RequestParam(required = false) Rol rol,
            @Parameter(description = "estado") @RequestParam(required = false) EstadoCuenta estado,
            @Parameter(description = "Página, desde 1.") @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Elementos por página (máximo 100).") @RequestParam(defaultValue = "10") int limite
    ) {
        return ResponseEntity.ok(usuarioService.listar(buscar, rol, estado, pagina, limite));
    }

    @PostMapping
    @Operation(summary = "Crear usuario",
            description = "Administrador. La cuenta se crea Activa y el usuario recibe un correo de bienvenida para definir su contraseña con el flujo de recuperación.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<UsuarioResponse> crear(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Valid @RequestBody CrearUsuarioRequest solicitud
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarioService.crear(yo.id(), solicitud));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Editar usuario",
            description = "Administrador. Queda en la bitácora.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<UsuarioResponse> actualizar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody ActualizarUsuarioRequest solicitud
    ) {
        return ResponseEntity.ok(usuarioService.actualizar(yo.id(), id, solicitud));
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Activar o desactivar",
            description = "Administrador. Un administrador no puede desactivarse a sí mismo (409).",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<UsuarioResponse> cambiarEstado(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoUsuarioRequest solicitud
    ) {
        return ResponseEntity.ok(usuarioService.cambiarEstado(yo.id(), id, solicitud.estado()));
    }

    @PatchMapping("/{id}/rol")
    @Operation(summary = "Cambiar rol",
            description = "Administrador. Queda en la bitácora.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<UsuarioResponse> cambiarRol(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody CambiarRolRequest solicitud
    ) {
        return ResponseEntity.ok(usuarioService.cambiarRol(yo.id(), id, solicitud.rol()));
    }

    @PatchMapping("/{id}/aprobacion")
    @Operation(summary = "Aprobar o rechazar organizador",
            description = "Administrador. Aprobado: Organizador Activo; rechazado: Participante Activo. Notifica al usuario. 409 si la cuenta no está Pendiente.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<UsuarioResponse> resolverAprobacion(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody AprobacionOrganizadorRequest solicitud
    ) {
        return ResponseEntity.ok(usuarioService.resolverAprobacion(yo.id(), id, solicitud));
    }

    @GetMapping(value = "/exportar", produces = {"application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
    @Operation(summary = "Exportar usuarios",
            description = "Administrador. Respeta los filtros; indica la fecha de generación y quién la solicitó.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Resource> exportar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Parameter(description = "formato") @RequestParam(defaultValue = "pdf") FormatoExportacion formato,
            @Parameter(description = "buscar") @RequestParam(required = false) String buscar,
            @Parameter(description = "rol") @RequestParam(required = false) Rol rol,
            @Parameter(description = "estado") @RequestParam(required = false) EstadoCuenta estado
    ) {
        ExportadorTabla.Archivo archivo = usuarioService.exportar(yo.id(), formato, buscar, rol, estado);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(archivo.nombre()).build().toString())
                .contentType(MediaType.parseMediaType(archivo.tipoContenido()))
                .body(new ByteArrayResource(archivo.contenido()));
    }
}
