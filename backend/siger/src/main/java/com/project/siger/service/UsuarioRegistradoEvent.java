package com.project.siger.service;

/**
 * Se publica al registrar una cuenta. La verificación de correo lo escucha después del COMMIT
 * para crear el enlace y enviarlo; así el registro no depende de que el correo salga.
 */
public record UsuarioRegistradoEvent(Long idUsuario, String correoElectronico) {
}
