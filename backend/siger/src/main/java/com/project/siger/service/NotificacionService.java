package com.project.siger.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.dto.response.NotificacionResponse;
import com.project.siger.dto.response.NotificacionesResponse;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Evento;
import com.project.siger.model.Notificacion;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.repository.NotificacionRepository;

/**
 * Notificaciones al usuario. Cada aviso se guarda en notificaciones como Pendiente dentro de la
 * transacción del caso de uso y su correo se publica como CorreoPendiente: EnvioCorreosListener lo envía después del
 * COMMIT. Los datos sensibles (códigos, enlaces) van solo en el modelo de la plantilla, nunca en
 * mensaje_contenido. También atiende el centro de notificaciones de la campana
 */
@Service
public class NotificacionService {

    static final int LIMITE_MAXIMO = 100;

    private final NotificacionRepository notificaciones;
    private final ApplicationEventPublisher eventos;

    public NotificacionService(NotificacionRepository notificaciones, ApplicationEventPublisher eventos) {
        this.notificaciones = notificaciones;
        this.eventos = eventos;
    }

    /** Notifica al correo de la cuenta. */
    @Transactional(propagation = Propagation.MANDATORY)
    public Notificacion notificar(Usuario usuario, Evento evento, TipoNotificacion tipo, String asunto, String resumen,
            String plantilla, Map<String, Object> modelo) {
        return notificar(usuario, usuario.getCorreoElectronico(), evento, tipo, asunto, resumen, plantilla, modelo, List.of());
    }

    /** Notifica al correo de la cuenta con imágenes incrustadas (por ejemplo, el QR del comprobante). */
    @Transactional(propagation = Propagation.MANDATORY)
    public Notificacion notificar(Usuario usuario, Evento evento, TipoNotificacion tipo, String asunto, String resumen,
            String plantilla, Map<String, Object> modelo, List<CorreoService.Adjunto> adjuntos) {
        return notificar(usuario, usuario.getCorreoElectronico(), evento, tipo, asunto, resumen, plantilla, modelo, adjuntos);
    }

    /** Notifica a otro destino (por ejemplo, el correo nuevo que se está verificando */
    @Transactional(propagation = Propagation.MANDATORY)
    public Notificacion notificar(Usuario usuario, String destino, Evento evento, TipoNotificacion tipo, String asunto,
            String resumen, String plantilla, Map<String, Object> modelo) {
        return notificar(usuario, destino, evento, tipo, asunto, resumen, plantilla, modelo, List.of());
    }

    private Notificacion notificar(Usuario usuario, String destino, Evento evento, TipoNotificacion tipo, String asunto,
            String resumen, String plantilla, Map<String, Object> modelo, List<CorreoService.Adjunto> adjuntos) {
        Notificacion n = new Notificacion();
        n.setUsuario(usuario);
        n.setEvento(evento);
        n.setTipoNotificacion(tipo);
        n.setAsunto(asunto);
        n.setMensajeContenido(resumen);
        notificaciones.save(n);
        eventos.publishEvent(new CorreoPendiente(n.getId(), destino, asunto, plantilla, conNombre(modelo, usuario.getNombres()), adjuntos));
        return n;
    }

    static Map<String, Object> conNombre(Map<String, Object> modelo, String nombre) {
        var copia = new HashMap<String, Object>(modelo);
        copia.putIfAbsent("nombre", nombre);
        return copia;
    }

    // ───────────── Centro de notificaciones  ─────────────

    /** Notificaciones propias, de la más reciente a la más antigua, con el contador de no leídas de la campana. */
    @Transactional(readOnly = true)
    public NotificacionesResponse mias(Long idUsuario, Boolean leida, int pagina, int limite) {
        if (pagina < 1 || limite < 1 || limite > LIMITE_MAXIMO) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO,
                    "La página empieza en 1 y el límite debe estar entre 1 y " + LIMITE_MAXIMO + ".");
        }
        PageRequest pr = PageRequest.of(pagina - 1, limite, Sort.by(Sort.Order.desc("fechaCreacion"), Sort.Order.desc("id")));
        Page<Notificacion> pag = leida == null ? notificaciones.findByUsuarioId(idUsuario, pr)
                : notificaciones.findByUsuarioIdAndLeida(idUsuario, leida, pr);
        var contenido = pag.map(NotificacionService::respuesta).getContent();
        return new NotificacionesResponse(new PageResponse<>(contenido, pagina, limite, pag.getTotalPages(), pag.getTotalElements()),
                notificaciones.countByUsuarioIdAndLeidaFalse(idUsuario));
    }

    /** Solo notificaciones propias; las de otros no existen para este usuario (404). */
    @Transactional
    public void marcarLeida(Long idUsuario, Long id) {
        if (notificaciones.marcarLeida(id, idUsuario) == 0 && !notificaciones.existsByIdAndUsuarioId(id, idUsuario)) {
            throw new RecursoNoEncontradoException("Notificación", id);
        }
    }

    @Transactional
    public void marcarTodasLeidas(Long idUsuario) {
        notificaciones.marcarTodasLeidas(idUsuario);
    }

    private static NotificacionResponse respuesta(Notificacion n) {
        return new NotificacionResponse(n.getId(), n.getTipoNotificacion(), n.getAsunto(), n.getMensajeContenido(),
                n.getEvento() == null ? null : n.getEvento().getId(), n.isLeida(), n.getFechaCreacion());
    }
}
