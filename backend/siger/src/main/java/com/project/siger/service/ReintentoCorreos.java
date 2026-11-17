package com.project.siger.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.model.Evento;
import com.project.siger.model.Notificacion;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoEvento;
import com.project.siger.model.enums.EstadoReservacion;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.repository.BitacoraRepository;
import com.project.siger.repository.NotificacionRepository;
import com.project.siger.repository.ReservacionRepository;

/**
 * Reintento de los correos Fallidos. El contenido del correo no se guarda en la base (puede llevar datos
 * sensibles), así que se reconstruye según el tipo con los datos actuales. Los correos con un código o enlace de
 * seguridad (verificación, recuperación) no se reintentan: el usuario pide uno nuevo y el anterior queda invalidado.
 * Un correo que ya no tiene sentido (la reservación se canceló, el evento ya empezó) tampoco se reenvía.
 */
@Service
public class ReintentoCorreos {

    private static final Logger log = LoggerFactory.getLogger(ReintentoCorreos.class);

    /** Incluye el primer envío: un correo se intenta como máximo 3 veces. */
    static final short MAX_INTENTOS = 3;
    /** Solo se reintentan correos de las últimas 24 horas. */
    static final Duration VENTANA = Duration.ofHours(24);
    static final Set<TipoNotificacion> REINTENTABLES = EnumSet.of(TipoNotificacion.Bienvenida, TipoNotificacion.Aprobacion_Organizador,
            TipoNotificacion.Rechazo_Organizador, TipoNotificacion.Confirmacion_Reserva, TipoNotificacion.Cancelacion_Reserva,
            TipoNotificacion.Cambio_Evento, TipoNotificacion.Cancelacion_Evento, TipoNotificacion.Recordatorio);

    private record Correo(String plantilla, Map<String, Object> modelo, List<CorreoService.Adjunto> adjuntos) {
    }

    private final NotificacionRepository notificaciones;
    private final ReservacionRepository reservaciones;
    private final BitacoraRepository bitacora;
    private final ContenidoCorreos contenido;
    private final CorreoService correo;

    public ReintentoCorreos(NotificacionRepository notificaciones, ReservacionRepository reservaciones, BitacoraRepository bitacora,
            ContenidoCorreos contenido, CorreoService correo) {
        this.notificaciones = notificaciones;
        this.reservaciones = reservaciones;
        this.bitacora = bitacora;
        this.contenido = contenido;
        this.correo = correo;
    }

    /** Vuelve a enviar los Fallidos reintentables; devuelve cuántos se reenviaron (el envío corre en segundo plano). */
    @Transactional(readOnly = true)
    public int reintentar() {
        int n = 0;
        for (Notificacion x : notificaciones.paraReintentar(MAX_INTENTOS, OffsetDateTime.now().minus(VENTANA), REINTENTABLES)) {
            Optional<Correo> c = reconstruir(x);
            if (c.isEmpty()) {
                log.info("Notificación {} ({}) sin reintento: ya no aplica", x.getId(), x.getTipoNotificacion());
                continue;
            }
            Usuario u = x.getUsuario();
            correo.enviar(x.getId(), u.getCorreoElectronico(), x.getAsunto(), c.get().plantilla(),
                    NotificacionService.conNombre(c.get().modelo(), u.getNombres()), c.get().adjuntos());
            n++;
        }
        return n;
    }

    private Optional<Correo> reconstruir(Notificacion x) {
        Usuario u = x.getUsuario();
        Evento e = x.getEvento();
        return switch (x.getTipoNotificacion()) {
            case Bienvenida -> Optional.of(new Correo("bienvenida", Map.of("rol", u.getRol().name()), List.of()));
            case Aprobacion_Organizador -> Optional.of(new Correo("aprobacion_organizador", Map.of(), List.of()));
            case Rechazo_Organizador -> bitacora
                    .findFirstByAccionAndEntidadAndIdEntidadOrderByFechaDesc(BitacoraService.RECHAZAR_ORGANIZADOR, "usuarios", u.getId())
                    .map(b -> new Correo("rechazo_organizador", Map.of("motivo", String.valueOf(b.getDetalle().get("motivo"))), List.of()));
            case Confirmacion_Reserva, Recordatorio -> e == null || !e.getFechaHoraInicio().isAfter(OffsetDateTime.now())
                    ? Optional.empty()
                    : reservaciones.findFirstByEventoIdAndParticipanteIdAndEstadoReservacion(e.getId(), u.getId(), EstadoReservacion.Confirmada)
                            .map(r -> new Correo(x.getTipoNotificacion() == TipoNotificacion.Recordatorio ? "recordatorio" : "confirmacion_reserva",
                                    contenido.comprobante(r), contenido.qr(r)));
            case Cancelacion_Reserva -> e == null ? Optional.empty()
                    : Optional.of(new Correo("cancelacion_reserva", EventoService.datosCorreo(e, Map.of()), List.of()));
            case Cambio_Evento -> e == null || e.getEstadoEvento() != EstadoEvento.Publicado ? Optional.empty()
                    : Optional.of(new Correo("cambio_evento", EventoService.datosCorreo(e, Map.of()), List.of()));
            case Cancelacion_Evento -> e == null || e.getMotivoCancelacion() == null ? Optional.empty()
                    : Optional.of(new Correo("cancelacion_evento",
                            EventoService.datosCorreo(e, Map.of("motivo", e.getMotivoCancelacion())), List.of()));
            default -> Optional.empty();
        };
    }
}
