package com.project.siger.dto.mapper;

import java.time.OffsetDateTime;
import org.springframework.stereotype.Component;
import com.project.siger.dto.response.EventoResponse;
import com.project.siger.dto.response.EventoResumenResponse;
import com.project.siger.dto.response.OrganizadorResponse;
import com.project.siger.model.Evento;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoEvento;

/**
 * Evento → respuestas del contrato. Se escribe a mano (no con MapStruct) porque varios campos se calculan:
 * lleno, aceptaReservaciones y los datos del organizador.
 */
@Component
public class EventoMapper {

    public EventoResumenResponse resumen(Evento e) {
        return new EventoResumenResponse(e.getId(), e.getNombreEvento(), e.getCategoria().getId(),
                e.getCategoria().getNombre(), e.getFechaHoraInicio(), e.getFechaHoraFin(), e.getUbicacion(),
                e.getCupoMaximo(), e.getCupoDisponible(), lleno(e), e.getPrecio(), e.getImagenUrl(), e.getEstadoEvento(),
                e.isReprogramado());
    }

    public EventoResponse detalle(Evento e) {
        Usuario o = e.getOrganizador();
        return new EventoResponse(e.getId(), e.getNombreEvento(), e.getDescripcion(), e.getCategoria().getId(),
                e.getCategoria().getNombre(), e.getFechaHoraInicio(), e.getFechaHoraFin(), e.getFechaLimiteReserva(),
                e.getUbicacion(), e.getCupoMaximo(), e.getCupoDisponible(), lleno(e), e.getMaxAcompanantes(),
                e.getPrecio(), e.getImagenUrl(), e.isRequiereQr(), e.getEstadoEvento(), e.isReprogramado(),
                e.getMotivoCancelacion(), aceptaReservaciones(e),
                new OrganizadorResponse(o.getId(), o.getNombres() + " " + o.getApellidos(), o.getCorreoElectronico()),
                e.getFechaCreacion(), e.getFechaActualizacion());
    }

    /** RN-01: un evento sin cupos se muestra como Lleno. */
    static boolean lleno(Evento e) {
        return e.getCupoDisponible() == 0;
    }

    /** RN-08: Publicado, antes de la fecha límite y con cupo. */
    public static boolean aceptaReservaciones(Evento e) {
        return e.getEstadoEvento() == EstadoEvento.Publicado && OffsetDateTime.now().isBefore(e.getFechaLimiteReserva())
                && e.getCupoDisponible() > 0;
    }
}
