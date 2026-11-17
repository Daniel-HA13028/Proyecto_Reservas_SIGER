package com.project.siger.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.service.ReporteService;
import com.project.siger.service.ExportadorTabla;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.dto.FormatoExportacion;
import com.project.siger.dto.TipoReporte;
import com.project.siger.dto.response.ReporteResponse;

/**
 * Reportes y exportación.
 * El organizador solo obtiene datos de sus eventos.
 */
@RestController
@RequestMapping("/api/v1/reportes")
@Tag(name = "Reportes", description = "Reportes y exportación.")
public class ReporteController {

    private final ReporteService reporteService;

    public ReporteController(ReporteService reporteService) {
        this.reporteService = reporteService;
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @GetMapping
    @Operation(summary = "Generar reporte",
            description = "Organizador o Administrador. El Organizador solo obtiene datos de sus eventos.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ReporteResponse> generar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Parameter(description = "tipo") @RequestParam(defaultValue = "global") TipoReporte tipo,
            @Parameter(description = "Desde.") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @Parameter(description = "Hasta.") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @Parameter(description = "Evento u organizador, según el tipo.") @RequestParam(required = false) Long id
    ) {
        return ResponseEntity.ok(reporteService.generar(yo, tipo, desde, hasta, id));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @GetMapping(value = "/exportar", produces = {"application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
    @Operation(summary = "Exportar reporte",
            description = "Organizador o Administrador. Indica la fecha de generación y quién lo solicitó.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Resource> exportar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Parameter(description = "formato") @RequestParam(defaultValue = "pdf") FormatoExportacion formato,
            @Parameter(description = "tipo") @RequestParam(defaultValue = "global") TipoReporte tipo,
            @Parameter(description = "Desde.") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @Parameter(description = "Hasta.") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @Parameter(description = "id") @RequestParam(required = false) Long id
    ) {
        ExportadorTabla.Archivo archivo = reporteService.exportar(yo, formato, tipo, desde, hasta, id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(archivo.nombre()).build().toString())
                .contentType(MediaType.parseMediaType(archivo.tipoContenido()))
                .body(new ByteArrayResource(archivo.contenido()));
    }
}
