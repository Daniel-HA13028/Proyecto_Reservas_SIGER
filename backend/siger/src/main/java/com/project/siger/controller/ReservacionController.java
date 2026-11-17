package com.project.siger.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.service.ReservacionService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.CacheControl;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.dto.request.CrearReservacionRequest;
import com.project.siger.dto.GrupoReservaciones;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.ReservacionResponse;

/**
 * Reservación de cupos y comprobantes.
 * Solo el participante dueño ve, descarga o cancela su reservación; a cualquier otro se le responde 404.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Reservaciones", description = "Reservación de cupos y comprobantes.")
public class ReservacionController {

    private final ReservacionService reservacionService;

    public ReservacionController(ReservacionService reservacionService) {
        this.reservacionService = reservacionService;
    }

    @PreAuthorize("hasRole('PARTICIPANTE')")
    @PostMapping("/eventos/{id}/reservaciones")
    @Operation(summary = "Reservar cupo",
            description = "Participante. Descuenta los cupos sin sobreventa y envía el comprobante con QR. 409: CUPO_AGOTADO, RESERVA_DUPLICADA o EVENTO_NO_DISPONIBLE.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ReservacionResponse> reservar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody CrearReservacionRequest solicitud
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservacionService.reservar(yo.id(), id, solicitud));
    }

    @PreAuthorize("hasRole('PARTICIPANTE')")
    @GetMapping("/reservaciones/mias")
    @Operation(summary = "Mis reservaciones",
            description = "Participante. Grupos: próximas, pasadas (con asistencia) y canceladas.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<PageResponse<ReservacionResponse>> misReservaciones(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Parameter(description = "grupo") @RequestParam(defaultValue = "proximas") GrupoReservaciones grupo,
            @Parameter(description = "Página, desde 1.") @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Elementos por página (máximo 100).") @RequestParam(defaultValue = "10") int limite
    ) {
        return ResponseEntity.ok(reservacionService.mias(yo.id(), grupo, pagina, limite));
    }

    @PreAuthorize("hasRole('PARTICIPANTE')")
    @GetMapping("/reservaciones/{id}")
    @Operation(summary = "Ver comprobante",
            description = "Participante dueño.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ReservacionResponse> detalle(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(reservacionService.detalle(yo.id(), id));
    }

    @PreAuthorize("hasRole('PARTICIPANTE')")
    @GetMapping(value = "/reservaciones/{id}/qr", produces = {"image/png"})
    @Operation(summary = "Imagen QR del comprobante",
            description = "Participante dueño. PNG descargable.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<Resource> qr(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename("comprobante-" + id + ".png").build().toString())
                .body(new ByteArrayResource(reservacionService.qr(yo.id(), id)));
    }

    @PreAuthorize("hasRole('PARTICIPANTE')")
    @PatchMapping("/reservaciones/{id}/cancelar")
    @Operation(summary = "Cancelar reservación",
            description = "Participante dueño. Solo con al menos 24 h de anticipación (422); devuelve los cupos.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<ReservacionResponse> cancelar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(reservacionService.cancelar(yo.id(), id));
    }
}
