package com.project.siger.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.service.DashboardService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.dto.response.DashboardAdminResponse;
import com.project.siger.dto.response.DashboardOrganizadorResponse;
import com.project.siger.dto.response.DashboardParticipanteResponse;

/**
 * Indicadores por rol.
 * Cada rol ve solo su propio dashboard.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboards", description = "Indicadores por rol.")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @GetMapping("/admin")
    @Operation(summary = "Dashboard del Administrador",
            description = "Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<DashboardAdminResponse> admin() {
        return ResponseEntity.ok(dashboardService.admin());
    }

    @PreAuthorize("hasRole('ORGANIZADOR')")
    @GetMapping("/organizador")
    @Operation(summary = "Dashboard del Organizador",
            description = "Organizador; solo sus eventos.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<DashboardOrganizadorResponse> organizador(@Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo) {
        return ResponseEntity.ok(dashboardService.organizador(yo));
    }

    @PreAuthorize("hasRole('PARTICIPANTE')")
    @GetMapping("/participante")
    @Operation(summary = "Dashboard del Participante",
            description = "Participante.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<DashboardParticipanteResponse> participante(@Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo) {
        return ResponseEntity.ok(dashboardService.participante(yo));
    }
}
