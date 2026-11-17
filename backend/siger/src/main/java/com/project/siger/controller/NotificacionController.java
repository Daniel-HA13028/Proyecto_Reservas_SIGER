package com.project.siger.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.service.NotificacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.dto.response.NotificacionesResponse;

/**
 * Centro de notificaciones.
 * Cada usuario ve y marca solo sus propias notificaciones.
 */
@RestController
@RequestMapping("/api/v1/notificaciones")
@Tag(name = "Notificaciones", description = "Centro de notificaciones.")
public class NotificacionController {

    private final NotificacionService notificacionService;

    public NotificacionController(NotificacionService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping
    @Operation(summary = "Mis notificaciones",
            description = "Autenticado. Incluye el contador de no leídas.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<NotificacionesResponse> listar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Parameter(description = "leida") @RequestParam(required = false) Boolean leida,
            @Parameter(description = "Página, desde 1.") @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Elementos por página (máximo 100).") @RequestParam(defaultValue = "10") int limite
    ) {
        return ResponseEntity.ok(notificacionService.mias(yo.id(), leida, pagina, limite));
    }

    @PreAuthorize("isAuthenticated()")
    @PatchMapping("/{id}/leida")
    @Operation(summary = "Marcar como leída",
            description = "Autenticado; solo notificaciones propias.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> marcarLeida(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        notificacionService.marcarLeida(yo.id(), id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("isAuthenticated()")
    @PatchMapping("/leidas")
    @Operation(summary = "Marcar todas como leídas",
            description = "Autenticado. Marca como leídas todas las notificaciones propias (botón del centro de notificaciones).",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> marcarTodasLeidas(@Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo) {
        notificacionService.marcarTodasLeidas(yo.id());
        return ResponseEntity.noContent().build();
    }
}
