package com.project.siger.service;

import java.util.List;
import java.util.Map;

/**
 * Correo de una notificación recién guardada. NotificacionService lo publica dentro de la transacción y
 * EnvioCorreosListener lo envía solo si la transacción se confirma.
 */
public record CorreoPendiente(Long idNotificacion, String destino, String asunto, String plantilla, Map<String, Object> modelo,
        List<CorreoService.Adjunto> adjuntos) {
}
