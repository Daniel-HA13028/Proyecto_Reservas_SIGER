package com.project.siger.service;

import static com.project.siger.service.ExportadorTabla.ZONA;

import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.GrupoReservaciones;
import com.project.siger.dto.mapper.EventoMapper;
import com.project.siger.dto.response.ActividadResponse;
import com.project.siger.dto.response.DashboardAdminResponse;
import com.project.siger.dto.response.DashboardOrganizadorResponse;
import com.project.siger.dto.response.DashboardParticipanteResponse;
import com.project.siger.dto.response.EventoResumenResponse;
import com.project.siger.dto.response.ReservacionRecienteResponse;
import com.project.siger.dto.response.SerieValorResponse;
import com.project.siger.repository.EventoRepository;

/**
 * Dashboards por rol. Las cifras usan las mismas reglas que los reportes: eventos sin borradores
 * ni cancelados, reservaciones confirmadas y asistencias vigentes; la asistencia solo cuenta eventos que ya iniciaron.
 */
@Service
public class DashboardService {

    static final int MESES_ASISTENCIA = 6;
    static final int ACTIVIDAD = 10;
    static final int PROXIMOS = 5;
    static final int RECIENTES = 8;
    static final int RECOMENDADOS = 6;
    private static final DateTimeFormatter MES = DateTimeFormatter.ofPattern("yyyy-MM");

    private final NamedParameterJdbcTemplate sql;
    private final EventoRepository eventos;
    private final EventoMapper eventoMapper;
    private final ReservacionService reservaciones;

    public DashboardService(NamedParameterJdbcTemplate sql, EventoRepository eventos, EventoMapper eventoMapper,
            ReservacionService reservaciones) {
        this.sql = sql;
        this.eventos = eventos;
        this.eventoMapper = eventoMapper;
        this.reservaciones = reservaciones;
    }

    /** Administrador: usuarios, organizadores pendientes, eventos activos, reservaciones, soporte, asistencia y actividad. */
    @Transactional(readOnly = true)
    public DashboardAdminResponse admin() {
        Map<String, Object> k = sql.queryForMap("""
                SELECT (SELECT count(*) FROM usuarios WHERE estado_cuenta = 'Activo') AS usuarios,
                       (SELECT count(*) FROM usuarios WHERE estado_cuenta = 'Pendiente') AS pendientes,
                       (SELECT count(*) FROM eventos WHERE estado_evento = 'Publicado' AND fecha_hora_fin > now()) AS eventos,
                       (SELECT count(*) FROM reservaciones WHERE estado_reservacion = 'Confirmada') AS reservaciones,
                       (SELECT count(*) FROM solicitudes_soporte WHERE estado IN ('Abierta', 'En_Proceso')) AS soporte""",
                new MapSqlParameterSource());
        return new DashboardAdminResponse(num(k, "usuarios"), num(k, "pendientes"), num(k, "eventos"), num(k, "reservaciones"),
                num(k, "soporte"), asistenciaPorMes(), actividadReciente());
    }

    /** Organizador: solo sus eventos  */
    @Transactional(readOnly = true)
    public DashboardOrganizadorResponse organizador(UsuarioAutenticado actor) {
        MapSqlParameterSource p = new MapSqlParameterSource("id", actor.id());
        Map<String, Object> k = sql.queryForMap("""
                SELECT (SELECT count(*) FROM eventos WHERE id_organizador = :id AND estado_evento = 'Publicado'
                          AND fecha_hora_fin > now()) AS activos,
                       (SELECT coalesce(sum(1 + r.cantidad_acompanantes), 0) FROM reservaciones r JOIN eventos e ON e.id_evento = r.id_evento
                         WHERE e.id_organizador = :id AND e.estado_evento <> 'Cancelado' AND r.estado_reservacion = 'Confirmada') AS personas,
                       (SELECT coalesce(round(avg(tasa)::numeric, 1), 0) FROM (
                           SELECT 100.0 * count(a.id_asistencia) / count(r.id_reservacion) AS tasa
                           FROM eventos e JOIN reservaciones r ON r.id_evento = e.id_evento AND r.estado_reservacion = 'Confirmada'
                           LEFT JOIN asistencias a ON a.id_reservacion = r.id_reservacion AND NOT a.anulada
                           WHERE e.id_organizador = :id AND e.estado_evento IN ('Publicado', 'Finalizado') AND e.fecha_hora_inicio <= now()
                           GROUP BY e.id_evento) t) AS promedio""", p);
        List<EventoResumenResponse> proximos = sql.queryForList("""
                SELECT id_evento FROM eventos WHERE id_organizador = :id AND estado_evento = 'Publicado' AND fecha_hora_inicio > now()
                ORDER BY fecha_hora_inicio LIMIT %d""".formatted(PROXIMOS), p, Long.class).stream()
                .map(id -> eventoMapper.resumen(eventos.findById(id).orElseThrow())).toList();
        List<ReservacionRecienteResponse> recientes = sql.query("""
                SELECT r.id_reservacion, e.nombre_evento, u.nombres || ' ' || u.apellidos AS participante, r.cantidad_acompanantes,
                       r.fecha_reservacion
                FROM reservaciones r JOIN eventos e ON e.id_evento = r.id_evento JOIN usuarios u ON u.id_usuario = r.id_participante
                WHERE e.id_organizador = :id AND r.estado_reservacion = 'Confirmada'
                ORDER BY r.fecha_reservacion DESC, r.id_reservacion DESC LIMIT %d""".formatted(RECIENTES), p, (rs, i) ->
                new ReservacionRecienteResponse(rs.getLong("id_reservacion"), rs.getString("nombre_evento"), rs.getString("participante"),
                        rs.getInt("cantidad_acompanantes"), fecha(rs.getTimestamp("fecha_reservacion"))));
        return new DashboardOrganizadorResponse(num(k, "activos"), num(k, "personas"), ((Number) k.get("promedio")).doubleValue(),
                proximos, recientes);
    }

    /** Participante: próximas reservaciones, eventos a los que asistió y recomendaciones por sus categorías. */
    @Transactional(readOnly = true)
    public DashboardParticipanteResponse participante(UsuarioAutenticado actor) {
        MapSqlParameterSource p = new MapSqlParameterSource("id", actor.id());
        long asistidos = sql.queryForObject("""
                SELECT count(*) FROM asistencias a JOIN reservaciones r ON r.id_reservacion = a.id_reservacion
                WHERE r.id_participante = :id AND NOT a.anulada""", p, Long.class);
        // Primero los eventos de las categorías en las que ya reservó; si no hay, los próximos con cupo.
        List<EventoResumenResponse> recomendados = sql.queryForList("""
                SELECT e.id_evento FROM eventos e
                WHERE e.estado_evento = 'Publicado' AND e.fecha_limite_reserva > now() AND e.cupo_disponible > 0
                  AND NOT EXISTS (SELECT 1 FROM reservaciones r WHERE r.id_evento = e.id_evento AND r.id_participante = :id
                                  AND r.estado_reservacion = 'Confirmada')
                ORDER BY (e.id_categoria IN (SELECT x.id_categoria FROM reservaciones r JOIN eventos x ON x.id_evento = r.id_evento
                                             WHERE r.id_participante = :id)) DESC, e.fecha_hora_inicio
                LIMIT %d""".formatted(RECOMENDADOS), p, Long.class).stream()
                .map(id -> eventoMapper.resumen(eventos.findById(id).orElseThrow())).toList();
        return new DashboardParticipanteResponse(reservaciones.mias(actor.id(), GrupoReservaciones.proximas, 1, PROXIMOS).contenido(),
                asistidos, recomendados);
    }

    /** Tasa de asistencia de los eventos que iniciaron en cada uno de los últimos 6 meses. */
    private List<SerieValorResponse> asistenciaPorMes() {
        YearMonth actual = YearMonth.now(ZONA);
        YearMonth primero = actual.minusMonths(MESES_ASISTENCIA - 1);
        Map<String, Double> valores = new LinkedHashMap<>();
        sql.query("""
                SELECT to_char(date_trunc('month', e.fecha_hora_inicio AT TIME ZONE :zona), 'YYYY-MM') AS mes,
                       count(r.id_reservacion) AS confirmadas, count(a.id_asistencia) AS asistencias
                FROM eventos e JOIN reservaciones r ON r.id_evento = e.id_evento AND r.estado_reservacion = 'Confirmada'
                LEFT JOIN asistencias a ON a.id_reservacion = r.id_reservacion AND NOT a.anulada
                WHERE e.estado_evento IN ('Publicado', 'Finalizado') AND e.fecha_hora_inicio <= now() AND e.fecha_hora_inicio >= :desde
                GROUP BY 1""", new MapSqlParameterSource("zona", ZONA.getId())
                        .addValue("desde", primero.atDay(1).atStartOfDay(ZONA).toOffsetDateTime()),
                rs -> {
                    valores.put(rs.getString("mes"), ReporteService.tasa(rs.getLong("asistencias"), rs.getLong("confirmadas")));
                });
        List<SerieValorResponse> serie = new ArrayList<>();
        for (YearMonth m = primero; !m.isAfter(actual); m = m.plusMonths(1)) {
            serie.add(new SerieValorResponse(m.format(MES), valores.getOrDefault(m.format(MES), 0.0)));
        }
        return serie;
    }

    private List<ActividadResponse> actividadReciente() {
        return sql.query("""
                SELECT b.fecha, b.accion, coalesce(u.nombres || ' ' || u.apellidos, 'Sistema') AS usuario, b.entidad, b.id_entidad
                FROM bitacora b LEFT JOIN usuarios u ON u.id_usuario = b.id_usuario
                ORDER BY b.fecha DESC, b.id_bitacora DESC LIMIT %d""".formatted(ACTIVIDAD), new MapSqlParameterSource(), (rs, i) ->
                new ActividadResponse(fecha(rs.getTimestamp("fecha")), rs.getString("accion"), rs.getString("usuario"),
                        rs.getString("entidad"), (Long) rs.getObject("id_entidad", Long.class)))
                .stream().sorted(Comparator.comparing(ActividadResponse::fecha).reversed()).toList();
    }

    private static OffsetDateTime fecha(java.sql.Timestamp t) {
        return t.toInstant().atOffset(ZoneOffset.UTC);
    }

    private static long num(Map<String, Object> fila, String columna) {
        return ((Number) fila.get(columna)).longValue();
    }
}
