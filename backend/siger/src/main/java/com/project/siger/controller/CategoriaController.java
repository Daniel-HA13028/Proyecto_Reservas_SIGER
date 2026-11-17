package com.project.siger.controller;

import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.request.CambiarEstadoCategoriaRequest;
import com.project.siger.dto.request.CategoriaRequest;
import com.project.siger.dto.response.CategoriaResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.model.enums.Rol;
import com.project.siger.service.CategoriaService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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


/**
 * Consulta pública y administración de categorías.
 *Listar es público; el resto, solo Administrador.
 */
@RestController
@RequestMapping("/api/v1/categorias")
@Tag(name = "Categorías", description = "Consulta pública y administración de categorías.")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @GetMapping
    @Operation(summary = "Listar categorías",
            description = "Público: solo activas. Con todas=true requiere rol Administrador.")
    public ResponseEntity<List<CategoriaResponse>> listar(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Parameter(description = "true: incluye inactivas y el número de eventos (solo Administrador).") @RequestParam(defaultValue = "false") boolean todas
    ) {
        if (todas && (yo == null || yo.rol() != Rol.Administrador)) {
            throw new NegocioException(yo == null ? CodigoError.NO_AUTENTICADO : CodigoError.SIN_PERMISO);
        }
        return ResponseEntity.ok(categoriaService.listar(todas));
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PostMapping
    @Operation(summary = "Crear categoría",
            description = "Administrador. 409 si el nombre ya existe.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<CategoriaResponse> crear(
            @Valid @RequestBody CategoriaRequest solicitud
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.crear(solicitud.nombre()));
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PutMapping("/{id}")
    @Operation(summary = "Renombrar categoría",
            description = "Administrador.",
            security = @SecurityRequirement(name = "bearerAuth"),
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    public ResponseEntity<CategoriaResponse> renombrar(
            @PathVariable Long id,
            @Valid @RequestBody CategoriaRequest solicitud
    ) {
        return ResponseEntity.ok(categoriaService.renombrar(CategoriaService.id(id), solicitud.nombre()));
    }

    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @PatchMapping("/{id}/estado")
    @Operation(summary = "Activar o desactivar categoría",
            description = "Administrador. No se eliminan categorías.",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<CategoriaResponse> cambiarEstado(
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoCategoriaRequest solicitud
    ) {
        return ResponseEntity.ok(categoriaService.cambiarEstado(CategoriaService.id(id), solicitud.activa()));
    }
}
