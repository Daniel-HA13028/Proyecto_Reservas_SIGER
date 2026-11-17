package com.project.siger.dto.request;

/** Reglas de validación compartidas por los DTO de petición. */
public final class Validaciones {

    /** mínimo 8 caracteres con mayúscula, minúscula, número y símbolo (máximo 72 por el límite de BCrypt). */
    public static final String CONTRASENA = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,72}$";
    public static final String CONTRASENA_MENSAJE =
            "Debe tener entre 8 y 72 caracteres e incluir mayúscula, minúscula, número y símbolo";

    /** código de recuperación de 6 dígitos. */
    public static final String CODIGO_6_DIGITOS = "^\\d{6}$";

    private Validaciones() {
    }
}
