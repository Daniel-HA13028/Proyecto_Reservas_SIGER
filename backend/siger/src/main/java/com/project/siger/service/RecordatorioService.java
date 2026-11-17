package com.project.siger.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.model.Reservacion;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.repository.ReservacionRepository;

/**
 * Recordatorio 24 h antes del evento. Lo ejecuta cada hora TareasProgramadas: toma las reservaciones
 * confirmadas de eventos publicados que empiezan en las próximas 24 horas y que aún no tienen recordatorio. Si la tarea
 * no corrió a su hora (por ejemplo, el servidor estuvo apagado), el recordatorio sale en la siguiente ejecución.
 */
@Service
public class RecordatorioService {

    static final Duration ANTICIPACION = Duration.ofHours(24);

    private final ReservacionRepository reservaciones;
    private final NotificacionService notificaciones;
    private final ContenidoCorreos contenido;

    public RecordatorioService(ReservacionRepository reservaciones, NotificacionService notificaciones, ContenidoCorreos contenido) {
        this.reservaciones = reservaciones;
        this.notificaciones = notificaciones;
        this.contenido = contenido;
    }

    /** Devuelve cuántos recordatorios se generaron. */
    @Transactional
    public int enviarRecordatorios() {
        OffsetDateTime ahora = OffsetDateTime.now();
        int n = 0;
        for (Reservacion r : reservaciones.paraRecordatorio(ahora, ahora.plus(ANTICIPACION))) {
            // Quien reservó cuando ya faltaban menos de 24 h acaba de recibir la confirmación con el mismo QR.
            if (!r.getFechaReservacion().isBefore(r.getEvento().getFechaHoraInicio().minus(ANTICIPACION))) {
                continue;
            }
            notificaciones.notificar(r.getParticipante(), r.getEvento(), TipoNotificacion.Recordatorio,
                    "Recordatorio: " + r.getEvento().getNombreEvento(),
                    "Tu evento " + r.getEvento().getNombreEvento() + " empieza en menos de 24 horas.", "recordatorio",
                    contenido.comprobante(r), contenido.qr(r));
            n++;
        }
        return n;
    }
}
