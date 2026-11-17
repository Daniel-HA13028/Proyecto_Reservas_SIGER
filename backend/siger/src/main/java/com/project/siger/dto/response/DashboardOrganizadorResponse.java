package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Dashboard del Organizador. */
@Schema(description = "Dashboard del Organizador.")
public record DashboardOrganizadorResponse(
        long eventosActivos,

        long totalParticipantes,

        double porcentajeAsistenciaPromedio,

        List<EventoResumenResponse> proximosEventos,

        List<ReservacionRecienteResponse> reservacionesRecientes
) {
}
