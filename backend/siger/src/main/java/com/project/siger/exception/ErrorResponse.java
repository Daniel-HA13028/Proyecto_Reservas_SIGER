package com.project.siger.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Respuesta de error uniforme: { "error": { "codigo", "mensaje", "detalles" } } */
@Schema(description = "Respuesta de error uniforme de la API.")
public record ErrorResponse(Error error) {

    @Schema(name = "ErrorDetalle")
    public record Error(
            @Schema(description = "Código estable del catálogo CodigoError.", example = "CUPO_AGOTADO")
            CodigoError codigo,
            @Schema(description = "Mensaje en español para mostrar al usuario.")
            String mensaje,
            @Schema(description = "Errores por campo (validación, 422).")
            List<CampoError> detalles
    ) {
    }

    public record CampoError(String campo, String mensaje) {
    }

    public static ErrorResponse de(CodigoError codigo) {
        return de(codigo, codigo.getMensaje(), List.of());
    }

    public static ErrorResponse de(CodigoError codigo, String mensaje, List<CampoError> detalles) {
        return new ErrorResponse(new Error(codigo, mensaje, detalles));
    }
}
