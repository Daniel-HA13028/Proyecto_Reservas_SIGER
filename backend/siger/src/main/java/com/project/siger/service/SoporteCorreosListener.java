package com.project.siger.service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import com.project.siger.config.SoporteProperties;
import com.project.siger.dto.response.SolicitudSoporteResponse;

/**
 * Correos de soporte técnico, enviados después del COMMIT y en segundo plano (CorreoService.enviarDirecto):
 * <ul>
 * <li>Solicitud nueva: aviso al buzón de soporte (siger.soporte.correo), que se contesta directo a quien la reportó,
 * y acuse de recibo a esa persona con su número de seguimiento.</li>
 * <li>Cambio de estado: aviso a quien la reportó.</li>
 * </ul>
 * No se guardan en notificaciones porque una solicitud puede venir de alguien sin cuenta.
 */
@Component
public class SoporteCorreosListener {

    /** Solicitud recién creada. */
    public record SolicitudCreada(SolicitudSoporteResponse solicitud, String nombreUsuario) {
    }

    /** Solicitud que cambió de estado. */
    public record EstadoCambiado(SolicitudSoporteResponse solicitud) {
    }

    /** Respuesta escrita por el administrador desde el panel de soporte. */
    public record RespuestaEnviada(SolicitudSoporteResponse solicitud, String mensaje) {
    }

    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final ZoneId ZONA = ZoneId.of("America/El_Salvador");

    private final CorreoService correo;
    private final SoporteProperties propiedades;

    public SoporteCorreosListener(CorreoService correo, SoporteProperties propiedades) {
        this.correo = correo;
        this.propiedades = propiedades;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alCrear(SolicitudCreada e) {
        SolicitudSoporteResponse s = e.solicitud();
        Map<String, Object> modelo = modelo(s);
        if (propiedades.correo() != null) {
            modelo.put("usuario", e.nombreUsuario() == null ? "Sin cuenta (visitante)" : e.nombreUsuario());
            correo.enviarDirecto(propiedades.correo(), s.correoContacto(),
                    "Soporte #" + s.idSolicitud() + " · " + tipo(s), "soporte_nueva", modelo);
        }
        correo.enviarDirecto(s.correoContacto(), propiedades.correo(),
                "Recibimos tu solicitud de soporte #" + s.idSolicitud(), "soporte_acuse", modelo);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alCambiarEstado(EstadoCambiado e) {
        SolicitudSoporteResponse s = e.solicitud();
        correo.enviarDirecto(s.correoContacto(), propiedades.correo(),
                "Tu solicitud de soporte #" + s.idSolicitud() + " está " + estado(s), "soporte_estado", modelo(s));
    }

    /** Respuesta del Equipo Soporte SIGER; si la persona contesta, el correo llega al buzón de soporte. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alResponder(RespuestaEnviada e) {
        SolicitudSoporteResponse s = e.solicitud();
        Map<String, Object> modelo = modelo(s);
        modelo.put("mensaje", e.mensaje());
        correo.enviarDirecto(s.correoContacto(), propiedades.correo(),
                "Respuesta a tu solicitud de soporte #" + s.idSolicitud(), "soporte_respuesta", modelo);
    }

    private static Map<String, Object> modelo(SolicitudSoporteResponse s) {
        var m = new java.util.HashMap<String, Object>();
        m.put("id", s.idSolicitud());
        m.put("tipo", tipo(s));
        m.put("estado", estado(s));
        m.put("cerrada", s.estado() == com.project.siger.model.enums.EstadoSolicitudSoporte.Cerrada);
        m.put("descripcion", s.descripcion());
        m.put("correoContacto", s.correoContacto());
        m.put("fecha", s.fechaCreacion() == null ? "" : FECHA.format(s.fechaCreacion().atZoneSameInstant(ZONA)));
        return m;
    }

    private static String tipo(SolicitudSoporteResponse s) {
        return s.tipo().name().replace("Solicitud_Cambio", "Solicitud de cambio");
    }

    private static String estado(SolicitudSoporteResponse s) {
        return switch (s.estado()) {
            case Abierta -> "abierta";
            case En_Proceso -> "en proceso";
            case Cerrada -> "cerrada";
        };
    }
}
