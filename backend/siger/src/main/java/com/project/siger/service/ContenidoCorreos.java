package com.project.siger.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import com.project.siger.model.Reservacion;

/**
 * Datos de los correos que llevan el comprobante (confirmación de la reserva y recordatorio). Los usan
 * ReservacionService, RecordatorioService y ReintentoCorreos para que el correo sea siempre el mismo.
 */
@Component
public class ContenidoCorreos {

    private final QrService qr;

    public ContenidoCorreos(QrService qr) {
        this.qr = qr;
    }

    /** Modelo de las plantillas confirmacion_reserva y recordatorio. */
    public Map<String, Object> comprobante(Reservacion r) {
        return EventoService.datosCorreo(r.getEvento(), Map.of(
                "codigo", r.getCodigoComprobante(), "acompanantes", (int) r.getCantidadAcompanantes(),
                "monto", montoTexto(r.getMonto()), "idReservacion", r.getId()));
    }

    /** El QR incrustado en el correo; la plantilla lo muestra con src="cid:qr". */
    public List<CorreoService.Adjunto> qr(Reservacion r) {
        return List.of(new CorreoService.Adjunto("qr", qr.png(r.getCodigoComprobante()), "image/png"));
    }

    static String montoTexto(BigDecimal monto) {
        return monto.signum() == 0 ? "Gratis" : "US$ " + monto.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
