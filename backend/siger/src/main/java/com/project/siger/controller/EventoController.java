package com.project.siger.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.service.EventoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.project.siger.dto.request.CancelarEventoRequest;
import com.project.siger.dto.request.EventoRequest;
import com.project.siger.dto.OrdenCatalogo;
import com.project.siger.dto.response.EventoResponse;
import com.project.siger.dto.response.EventoResumenResponse;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.model.enums.EstadoEvento;

/**
 * Catálogo público y gestión de eventos.
 * Catálogo y detalle públicos; la gestión, del organizador dueño o un administrador.
 */
@RestController
@RequestMapping("/api/v1/eventos")
@Tag(name = "Eventos", description = "Catálogo público y gestión de eventos.")
public class EventoController {

    private final EventoService eventoService;

    public EventoController(EventoService eventoService) {
        this.eventoService = eventoService;
    }

    @GetMapping
    @Operation(summary = "Catálogo de eventos",
            description = "Público. Solo eventos Publicados cuya fecha de inicio no ha pasado. Debe responder en menos de 2 s.")
    public ResponseEntity<PageResponse<EventoResumenResponse>> catalogo(
            @Parameter(description = "Texto en nombre y ubicación.") @RequestParam(required = false) String buscar,
            @Parameter(description = "categoria") @RequestParam(required = false) Short categoria,
            @Parameter(description = "Desde (fecha de inicio).") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @Parameter(description = "Hasta (fecha de inicio).") @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @Parameter(description = "ubicacion") @RequestParam(required = false) String ubicacion,
            @Parameter(description = "orden") @RequestParam(defaultValue = "fecha") OrdenCatalogo orden,
            @Parameter(description = "Página, desde 1.") @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Elementos por página (máximo 100).") @RequestParam(defaultValue = "10") int limite
    ) {
        return ResponseEntity.ok(eventoService.catalogo(buscar, categoria, desde, hasta, ubicacion, orden, pagina, limite));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalle del evento",
            description = "Público. Los eventos en Borrador solo los ve su organizador o un Administrador (404 para los demás).")
    public ResponseEntity<EventoResponse> detalle(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(eventoService.detalle(id, yo));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @GetMapping("/mios")
    @Operation(summary = "Mis eventos",
            description = "Organizador.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<PageResponse<EventoResumenResponse>> misEventos(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Parameter(description = "estado") @RequestParam(required = false) EstadoEvento estado,
            @Parameter(description = "Página, desde 1.") @RequestParam(defaultValue = "1") int pagina,
            @Parameter(description = "Elementos por página (máximo 100).") @RequestParam(defaultValue = "10") int limite
    ) {
        return ResponseEntity.ok(eventoService.misEventos(yo, estado, pagina, limite));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Crear evento",
            description = "Organizador o Administrador. Se crea en Borrador. Imagen JPG o PNG de hasta 2 MB.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<EventoResponse> crear(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Valid @RequestPart("datos") EventoRequest datos,
            @RequestPart(value = "imagen", required = false) MultipartFile imagen
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventoService.crear(yo, datos, imagen));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Editar o reprogramar evento",
            description = "Organizador dueño o Administrador. Si cambia fecha, hora o ubicación de un evento publicado se marca reprogramado y se notifica a los reservados.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<EventoResponse> actualizar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestPart("datos") EventoRequest datos,
            @RequestPart(value = "imagen", required = false) MultipartFile imagen
    ) {
        return ResponseEntity.ok(eventoService.actualizar(yo, id, datos, imagen));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @PatchMapping("/{id}/publicar")
    @Operation(summary = "Publicar evento",
            description = "Organizador dueño o Administrador. Solo desde Borrador.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<EventoResponse> publicar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(eventoService.publicar(yo, id));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @PatchMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar evento",
            description = "Organizador dueño o Administrador. Cancela las reservaciones confirmadas y notifica a los participantes.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<EventoResponse> cancelar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id,
            @Valid @RequestBody CancelarEventoRequest solicitud
    ) {
        return ResponseEntity.ok(eventoService.cancelar(yo, id, solicitud.motivo()));
    }

    @PreAuthorize("hasAnyRole('ORGANIZADOR', 'ADMINISTRADOR')")
    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar borrador",
            description = "Organizador dueño o Administrador. Solo eventos en Borrador sin reservaciones (409 en otro caso).",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> eliminar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @PathVariable Long id
    ) {
        eventoService.eliminar(yo, id);
        return ResponseEntity.noContent().build();
    }
}
