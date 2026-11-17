package com.project.siger.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.service.SoporteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.dto.request.CambiarEstadoSolicitudRequest;
import com.project.siger.dto.request.CrearSolicitudSoporteRequest;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.SolicitudSoporteResponse;
import com.project.siger.model.enums.EstadoSolicitudSoporte;
import com.project.siger.model.enums.TipoSolicitudSoporte;

/**
 * Solicitudes de soporte técnico.
 * Reportar es público; listar y atender, solo el administrador.
 */
@RestController
@RequestMapping("/api/v1/soporte/tickets")
@Tag(name = "Soporte", description = "Solicitudes de soporte técnico.")
public class SoporteController {

    private final SoporteService soporteService;

    public SoporteController(SoporteService soporteService) {
        this.soporteService = soporteService;
    }

    @PostMapping
    @Operation(summary = "Reportar un problema",
            description = "Público; si hay sesión se asocia al usuario.",
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "429", value = "DemasiadasSolicitudes")}))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<SolicitudSoporteResponse> crear(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Valid @RequestBody CrearSolicitudSoporteRequest solicitud
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(soporteService.crear(yo == null ? null : yo.id(), solicitud));
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @GetMapping
    @Operation(summary = "Listar solicitudes",
            description = "Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<PageResponse<SolicitudSoporteResponse>> listar(
            @Parameter(description = "estado") @RequestParam(required = false) EstadoSolicitudSoporte estado,
            @Parameter(description = "tipo") @RequestParam(required = false) TipoSolicitudSoporte tipo,
            @Parameter(description = "Página, desde 1.") @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Elementos por página (máximo 100).") @RequestParam(defaultValue = "10") int limite
    ) {
        return ResponseEntity.ok(soporteService.listar(estado, tipo, pagina, limite));
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PatchMapping("/{id}/estado")
    @Operation(summary = "Cambiar estado",
            description = "Administrador. En_Proceso o Cerrada.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<SolicitudSoporteResponse> cambiarEstado(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoSolicitudRequest solicitud
    ) {
        return ResponseEntity.ok(soporteService.cambiarEstado(yo.id(), id, solicitud.estado()));
    }
}
