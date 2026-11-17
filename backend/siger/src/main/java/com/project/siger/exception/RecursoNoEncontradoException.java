package com.project.siger.exception;

/** El recurso pedido no existe (404). Ejemplo: new RecursoNoEncontradoException("evento", 15). */
public class RecursoNoEncontradoException extends NegocioException {

    public RecursoNoEncontradoException(String recurso, Object id) {
        super(CodigoError.RECURSO_NO_ENCONTRADO, "No encontramos " + recurso + " con id " + id + ".");
    }
}
