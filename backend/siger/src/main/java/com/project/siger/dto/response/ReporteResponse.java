package com.project.siger.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import com.project.siger.dto.TipoReporte;

/** Reporte por período: global, por evento o por organizador. */
@Schema(description = "Reporte por período: global, por evento o por organizador.")
public record ReporteResponse(
        TipoReporte tipo,

        LocalDate desde,

        LocalDate hasta,

        @Schema(description = "Evento u organizador, según el tipo.")
        Long idReferencia,

        long totalEventos,

        long totalParticipantes,

        long reservacionesConfirmadas,

        long asistencias,

        @Schema(description = "asistencias / reservaciones confirmadas.")
        double tasaAsistencia,

        BigDecimal ingresosSimulados,

        List<SerieValorResponse> registrosPorMes,

        List<SerieValorResponse> tendenciaReservaciones,

        List<ReporteCategoriaResponse> rendimientoPorCategoria,

        List<ReporteEventoResponse> eventosMayorAsistencia
) {
}
