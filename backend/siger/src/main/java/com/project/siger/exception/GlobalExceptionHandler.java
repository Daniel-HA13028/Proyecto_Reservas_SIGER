package com.project.siger.exception;

import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Convierte las excepciones en la respuesta uniforme ErrorResponse con un código de CodigoError.
 * Los 401 y 403 que detecta el filtro de Spring Security los responde config.ErroresSeguridadHandler con el mismo formato;
 * aquí se atienden los que lanzan los controladores y servicios.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(NegocioException.class)
    public ResponseEntity<ErrorResponse> negocio(NegocioException e) {
        return responder(e.getCodigo(), e.getMessage(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> validacion(MethodArgumentNotValidException e) {
        List<ErrorResponse.CampoError> detalles = e.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::campo)
                .sorted((a, b) -> a.campo().compareTo(b.campo()))
                .toList();
        return responder(CodigoError.VALIDACION_FALLIDA, CodigoError.VALIDACION_FALLIDA.getMensaje(), detalles);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> validacionParametros(HandlerMethodValidationException e) {
        List<ErrorResponse.CampoError> detalles = e.getParameterValidationResults().stream()
                .flatMap(r -> r.getResolvableErrors().stream()
                        .map(err -> new ErrorResponse.CampoError(r.getMethodParameter().getParameterName(), err.getDefaultMessage())))
                .toList();
        return responder(CodigoError.VALIDACION_FALLIDA, CodigoError.VALIDACION_FALLIDA.getMensaje(), detalles);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> validacionRestricciones(ConstraintViolationException e) {
        List<ErrorResponse.CampoError> detalles = e.getConstraintViolations().stream()
                .map(v -> new ErrorResponse.CampoError(v.getPropertyPath().toString(), v.getMessage()))
                .toList();
        return responder(CodigoError.VALIDACION_FALLIDA, CodigoError.VALIDACION_FALLIDA.getMensaje(), detalles);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> cuerpoInvalido(HttpMessageNotReadableException e) {
        return responder(CodigoError.SOLICITUD_INVALIDA, CodigoError.SOLICITUD_INVALIDA.getMensaje(), List.of());
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> tipoParametro(MethodArgumentTypeMismatchException e) {
        return responder(CodigoError.PARAMETRO_INVALIDO, CodigoError.PARAMETRO_INVALIDO.getMensaje(),
                List.of(new ErrorResponse.CampoError(e.getName(), "Valor no válido: " + e.getValue())));
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MissingServletRequestPartException.class})
    public ResponseEntity<ErrorResponse> parametroFaltante(Exception e) {
        return responder(CodigoError.PARAMETRO_INVALIDO, "Falta un dato obligatorio de la solicitud.", List.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> archivoGrande(MaxUploadSizeExceededException e) {
        return responder(CodigoError.ARCHIVO_DEMASIADO_GRANDE, CodigoError.ARCHIVO_DEMASIADO_GRANDE.getMensaje(), List.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> integridad(DataIntegrityViolationException e) {
        CodigoError codigo = RestriccionBd.desdeMensaje(e.getMostSpecificCause().getMessage());
        return responder(codigo, codigo.getMensaje(), List.of());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> rutaInexistente(NoResourceFoundException e) {
        return responder(CodigoError.RUTA_NO_ENCONTRADA, CodigoError.RUTA_NO_ENCONTRADA.getMensaje(), List.of());
    }

    /** El cliente no acepta el formato del recurso (por ejemplo, pide JSON al QR en PNG): 406 sin cuerpo, porque tampoco aceptaría el JSON del error. */
    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<Void> formatoNoAceptable(HttpMediaTypeNotAcceptableException e) {
        return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).build();
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> metodo(HttpRequestMethodNotSupportedException e) {
        return responder(CodigoError.METODO_NO_PERMITIDO, CodigoError.METODO_NO_PERMITIDO.getMensaje(), List.of());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> noAutenticado(AuthenticationException e) {
        return responder(CodigoError.NO_AUTENTICADO, CodigoError.NO_AUTENTICADO.getMensaje(), List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> sinPermiso(AccessDeniedException e) {
        // Sin sesión, un @PreAuthorize rechazado es 401 (debe iniciar sesión), no 403.
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth instanceof AnonymousAuthenticationToken || !auth.isAuthenticated()) {
            return responder(CodigoError.NO_AUTENTICADO, CodigoError.NO_AUTENTICADO.getMensaje(), List.of());
        }
        return responder(CodigoError.SIN_PERMISO, CodigoError.SIN_PERMISO.getMensaje(), List.of());
    }

    /** Métodos del contrato que todavía no se implementan */
    @ExceptionHandler(UnsupportedOperationException.class)
    public ResponseEntity<ErrorResponse> noImplementado(UnsupportedOperationException e) {
        return responder(CodigoError.NO_IMPLEMENTADO, CodigoError.NO_IMPLEMENTADO.getMensaje(), List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> inesperado(Exception e) {
        log.error("Error no controlado", e);
        return responder(CodigoError.ERROR_INTERNO, CodigoError.ERROR_INTERNO.getMensaje(), List.of());
    }

    private static ErrorResponse.CampoError campo(FieldError f) {
        return new ErrorResponse.CampoError(f.getField(), f.getDefaultMessage());
    }

    private static ResponseEntity<ErrorResponse> responder(CodigoError codigo, String mensaje, List<ErrorResponse.CampoError> detalles) {
        return ResponseEntity.status(codigo.getEstado()).body(ErrorResponse.de(codigo, mensaje, detalles));
    }
}
