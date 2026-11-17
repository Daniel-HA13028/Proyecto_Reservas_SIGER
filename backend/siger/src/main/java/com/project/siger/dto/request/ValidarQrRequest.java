package com.project.siger.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.project.siger.model.enums.MetodoValidacion;

/** Validación del comprobante en la entrada. */
@Schema(description = "Validación del comprobante en la entrada.")
public record ValidarQrRequest(
        @Schema(description = "Contenido del QR o código escrito.")
        @NotBlank
        @Size(max = 64)
        String codigo,

        @Schema(description = "QR_Scanner (cámara, por defecto) o Digital_Code (código escrito).")
        MetodoValidacion metodo
) {
}
