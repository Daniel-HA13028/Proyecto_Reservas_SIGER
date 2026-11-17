package com.project.siger.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Cola de correos: la notificación ya quedó guardada como Pendiente; después del COMMIT el correo se envía en
 * segundo plano (CorreoService, @Async) y queda Enviado o Fallido. Si la transacción se revierte, no sale nada; si el
 * SMTP falla, la operación del usuario (por ejemplo, la reservación) no se ve afectada y ReintentoCorreos lo reintenta.
 */
@Component
public class EnvioCorreosListener {

    private final CorreoService correo;

    public EnvioCorreosListener(CorreoService correo) {
        this.correo = correo;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alConfirmar(CorreoPendiente c) {
        correo.enviar(c.idNotificacion(), c.destino(), c.asunto(), c.plantilla(), c.modelo(), c.adjuntos());
    }
}
