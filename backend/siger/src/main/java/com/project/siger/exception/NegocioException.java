package com.project.siger.exception;

/** Violación de una regla de negocio. La lanza el service; GlobalExceptionHandler la convierte en JSON. */
public class NegocioException extends RuntimeException {

    private final CodigoError codigo;

    public NegocioException(CodigoError codigo) {
        this(codigo, codigo.getMensaje());
    }

    /** Permite un mensaje más específico que el del catálogo, por ejemplo con el número de intentos restantes. */
    public NegocioException(CodigoError codigo, String mensaje) {
        super(mensaje);
        this.codigo = codigo;
    }

    public CodigoError getCodigo() {
        return codigo;
    }
}
