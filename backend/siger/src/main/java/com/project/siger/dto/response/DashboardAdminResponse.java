package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** Dashboard del Administrador. */
@Schema(description = "Dashboard del Administrador.")
public record DashboardAdminResponse(
        long usuariosActivos,

        long organizadoresPendientes,

        long eventosActivos,

        long reservacionesConfirmadas,

        long solicitudesSoporteAbiertas,

        List<SerieValorResponse> asistenciaPorPeriodo,

        List<ActividadResponse> actividadReciente
) {
}
