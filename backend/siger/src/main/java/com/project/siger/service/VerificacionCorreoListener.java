package com.project.siger.service;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import com.project.siger.repository.UsuarioRepository;

/**
 * Al confirmarse un registro, crea el enlace de verificación y envía el correo
 * en una transacción propia. Si el correo falla, la cuenta ya quedó creada y se puede reenviar.
 */
@Component
public class VerificacionCorreoListener {

    private final UsuarioRepository usuarios;
    private final AuthService authService;

    public VerificacionCorreoListener(UsuarioRepository usuarios, AuthService authService) {
        this.usuarios = usuarios;
        this.authService = authService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void alRegistrar(UsuarioRegistradoEvent evento) {
        usuarios.findById(evento.idUsuario()).ifPresent(authService::enviarVerificacion);
    }
}
