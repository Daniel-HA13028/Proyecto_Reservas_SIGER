package com.project.siger.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.service.AsistenciaService;
import com.project.siger.service.ExportadorTabla;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.dto.request.AsistenciaManualRequest;
import com.project.siger.dto.FormatoExportacion;
import com.project.siger.dto.request.ValidarQrRequest;
import com.project.siger.dto.response.AsistenciaResponse;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.ParticipanteEventoResponse;
import com.project.siger.dto.response.ResumenAsistenciaResponse;

/**
 * Lista de participantes y control de asistencia
 * Solo el organizador dueño del evento o un administrador
 */
@RestController
@RequestMapping("/api/v1/eventos/{id}")
@Tag(name = "Asistencia", description = "Lista de participantes y control de asistencia.")
public class AsistenciaController {

    private final AsistenciaService asistenciaService;

    public AsistenciaController(AsistenciaService asistenciaService) {
        this.asistenciaService = asistenciaService;
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @GetMapping("/participantes")
    @Operation(summary = "Lista de participantes",
            description = "RF-18 · CU-05 · Organizador dueño o Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<PageResponse<ParticipanteEventoResponse>> participantes(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Parameter(description = "Nombre o correo.") @RequestParam(required = false) String buscar,
            @Parameter(description = "asistio") @RequestParam(required = false) Boolean asistio,
            @Parameter(description = "Página, desde 1.") @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Elementos por página (máximo 100).") @RequestParam(defaultValue = "10") int limite
    ) {
        return ResponseEntity.ok(asistenciaService.participantes(yo, id, buscar, asistio, pagina, limite));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @GetMapping(value = "/participantes/exportar", produces = {"application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})
    @Operation(summary = "Exportar participantes",
            description = "RF-18 · RF-24 · Organizador dueño o Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Resource> exportarParticipantes(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Parameter(description = "formato") @RequestParam(defaultValue = "pdf") FormatoExportacion formato,
            @Parameter(description = "buscar") @RequestParam(required = false) String buscar,
            @Parameter(description = "asistio") @RequestParam(required = false) Boolean asistio
    ) {
        ExportadorTabla.Archivo archivo = asistenciaService.exportar(yo, id, formato, buscar, asistio);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(archivo.nombre()).build().toString())
                .contentType(MediaType.parseMediaType(archivo.tipoContenido()))
                .body(new ByteArrayResource(archivo.contenido()));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @PostMapping("/asistencias/qr")
    @Operation(summary = "Validar QR",
            description = "RF-17 · CU-05 · RN-09 · I-21 · Organizador dueño o Administrador. Valida: el código existe, es de este evento, la reservación está Confirmada y no tiene asistencia. 409 ASISTENCIA_YA_REGISTRADA. Debe responder en menos de 2 s (RNF-04).",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<AsistenciaResponse> validarQr(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody ValidarQrRequest solicitud
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(asistenciaService.validarQr(yo, id, solicitud.codigo(), solicitud.metodo()));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @PostMapping("/asistencias")
    @Operation(summary = "Marcar asistencia manual",
            description = "RF-18 · RN-09 · Organizador dueño o Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<AsistenciaResponse> registrarManual(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody AsistenciaManualRequest solicitud
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(asistenciaService.registrarManual(yo, id, solicitud.idReservacion()));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @DeleteMapping("/asistencias/{idReservacion}")
    @Operation(summary = "Deshacer asistencia",
            description = "RF-18 · RN-09 · RN-15 · Organizador dueño o Administrador. Solo el mismo día del evento. La asistencia se marca como anulada (no se borra) y queda en la bitácora; la reservación puede registrarse de nuevo. 404 ASISTENCIA_NO_REGISTRADA si no hay asistencia vigente.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> deshacer(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @PathVariable Long idReservacion
    ) {
        asistenciaService.deshacer(yo, id, idReservacion);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @GetMapping("/asistencias/resumen")
    @Operation(summary = "Estadísticas en vivo",
            description = "RF-19 · CU-05 · Organizador dueño o Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ResumenAsistenciaResponse> resumen(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(asistenciaService.resumen(yo, id));
    }
}
