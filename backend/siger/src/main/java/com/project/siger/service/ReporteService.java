package com.project.siger.service;

import static com.project.siger.service.ExportadorTabla.FECHA;
import static com.project.siger.service.ExportadorTabla.FECHA_HORA;
import static com.project.siger.service.ExportadorTabla.ZONA;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.FormatoExportacion;
import com.project.siger.dto.TipoReporte;
import com.project.siger.dto.response.ReporteCategoriaResponse;
import com.project.siger.dto.response.ReporteEventoResponse;
import com.project.siger.dto.response.ReporteResponse;
import com.project.siger.dto.response.SerieValorResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Evento;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.Rol;
import com.project.siger.repository.UsuarioRepository;

/**
 * Reportes con consultas SQL agregadas (GROUP BY y date_trunc). Todas las cifras salen
 * del mismo conjunto: los eventos del alcance (sin borradores ni cancelados) cuyo inicio cae en el periodo, sus
 * reservaciones confirmadas y las asistencias vigentes de esas reservaciones. El administrador elige el alcance
 * (global, un organizador o un evento); el organizador solo obtiene sus propios eventos
 */
@Service
public class ReporteService {

    /** Una serie diaria si el periodo dura hasta 62 días; si no, mensual. */
    static final int MAX_DIAS_SERIE_DIARIA = 62;
    static final int TOP_EVENTOS = 10;
    private static final DateTimeFormatter MES = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /** Alcance resuelto: tipo efectivo, referencia (organizador o evento) y su nombre para los encabezados. */
    record Alcance(TipoReporte tipo, Long id, String nombre) {
    }

    /** Ventana de las series: de «desde» a «hasta» (días en hora de El Salvador) y su granularidad. */
    record Ventana(LocalDate desde, LocalDate hasta, boolean diaria) {
    }

    private final NamedParameterJdbcTemplate sql;
    private final EventoService eventoService;
    private final UsuarioRepository usuarios;
    private final ExportadorTabla exportador;
    private final BitacoraService bitacora;

    public ReporteService(NamedParameterJdbcTemplate sql, EventoService eventoService, UsuarioRepository usuarios,
            ExportadorTabla exportador, BitacoraService bitacora) {
        this.sql = sql;
        this.eventoService = eventoService;
        this.usuarios = usuarios;
        this.exportador = exportador;
        this.bitacora = bitacora;
    }

    @Transactional(readOnly = true)
    public ReporteResponse generar(UsuarioAutenticado actor, TipoReporte tipo, LocalDate desde, LocalDate hasta, Long id) {
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new NegocioException(CodigoError.PERIODO_INVALIDO);
        }
        Alcance alcance = alcance(actor, tipo, id);
        MapSqlParameterSource p = parametros(alcance, desde, hasta);
        String base = cte(alcance, desde, hasta);

        Map<String, Object> k = sql.queryForMap(base + """
                SELECT (SELECT count(*) FROM ev) AS eventos,
                       (SELECT count(DISTINCT id_participante) FROM res) AS participantes,
                       (SELECT count(*) FROM res) AS confirmadas,
                       (SELECT count(*) FROM asi) AS asistencias,
                       (SELECT count(*) FROM res WHERE iniciado) AS confirmadas_iniciados,
                       (SELECT count(*) FROM asi WHERE iniciado) AS asistencias_iniciados,
                       (SELECT coalesce(sum(monto), 0) FROM res) AS ingresos""", p);
        Ventana ventana = ventana(desde, hasta);
        return new ReporteResponse(alcance.tipo(), desde, hasta, alcance.id(), num(k, "eventos"), num(k, "participantes"),
                num(k, "confirmadas"), num(k, "asistencias"), tasa(num(k, "asistencias_iniciados"), num(k, "confirmadas_iniciados")),
                ((BigDecimal) k.get("ingresos")).setScale(2, RoundingMode.HALF_UP),
                registrosPorMes(alcance, base, p, ventana), tendencia(base, p, ventana), porCategoria(base, p), topEventos(base, p));
    }

    /** Exportar el reporte a PDF o Excel con la fecha de generación y quién lo pidió */
    @Transactional
    public ExportadorTabla.Archivo exportar(UsuarioAutenticado actor, FormatoExportacion formato, TipoReporte tipo, LocalDate desde,
            LocalDate hasta, Long id) {
        ReporteResponse r = generar(actor, tipo, desde, hasta, id);
        Alcance alcance = alcance(actor, tipo, id);
        Usuario solicitante = usuarios.findById(actor.id()).orElseThrow();
        List<ExportadorTabla.Seccion> secciones = List.of(
                new ExportadorTabla.Seccion("Resumen", new String[] {"Indicador", "Valor"}, new float[] {4, 2}, List.of(
                        new String[] {"Eventos", String.valueOf(r.totalEventos())},
                        new String[] {"Participantes (personas distintas)", String.valueOf(r.totalParticipantes())},
                        new String[] {"Reservaciones confirmadas", String.valueOf(r.reservacionesConfirmadas())},
                        new String[] {"Asistencias", String.valueOf(r.asistencias())},
                        new String[] {"Tasa de asistencia (eventos ya iniciados)", r.tasaAsistencia() + " %"},
                        new String[] {"Ingresos simulados", "US$ " + r.ingresosSimulados().toPlainString()})),
                new ExportadorTabla.Seccion("Por categoría", new String[] {"Categoría", "Eventos", "Reservaciones", "Asistencias", "Tasa"},
                        new float[] {3, 1, 1.4f, 1.4f, 1}, r.rendimientoPorCategoria().stream().map(c -> new String[] {
                                c.categoria(), String.valueOf(c.eventos()), String.valueOf(c.reservaciones()),
                                String.valueOf(c.asistencias()), c.tasaAsistencia() + " %"}).toList()),
                new ExportadorTabla.Seccion("Eventos con más asistencia",
                        new String[] {"Evento", "Inicio", "Categoría", "Cupo", "Reservaciones", "Asistencias", "Tasa", "Ingresos"},
                        new float[] {3.4f, 1.6f, 1.4f, 0.8f, 1.2f, 1.1f, 0.9f, 1.1f}, r.eventosMayorAsistencia().stream().map(e -> new String[] {
                                e.nombreEvento(), e.fechaHoraInicio().atZoneSameInstant(ZONA).format(FECHA_HORA), e.categoria(),
                                String.valueOf(e.cupoMaximo()), String.valueOf(e.reservaciones()), String.valueOf(e.asistencias()),
                                e.tasaAsistencia() + " %", "US$ " + e.ingresos().toPlainString()}).toList()),
                serie("Tendencia de reservaciones", "Reservaciones", r.tendenciaReservaciones()),
                serie(alcance.tipo() == TipoReporte.global ? "Registros por mes" : "Participantes nuevos",
                        alcance.tipo() == TipoReporte.global ? "Usuarios registrados" : "Participantes nuevos", r.registrosPorMes()));
        Map<String, Object> filtros = new LinkedHashMap<>();
        filtros.put("periodo", (desde == null ? "inicio" : desde.format(FECHA)) + " a " + (hasta == null ? "hoy" : hasta.format(FECHA)));
        var archivo = exportador.exportar(formato, "SIGER · Reporte " + descripcion(alcance), "reporte_" + alcance.tipo().name(),
                List.of("Alcance: " + descripcion(alcance),
                        "La tasa de asistencia considera solo los eventos que ya iniciaron."),
                secciones, filtros, solicitante.getNombres() + " " + solicitante.getApellidos());
        bitacora.registrar(solicitante, "EXPORTAR_REPORTE", "reportes", alcance.id(),
                Map.of("tipo", alcance.tipo().name(), "formato", formato.name()));
        return archivo;
    }

    /** el organizador solo ve sus eventos; para él, «global» son sus propios eventos. */
    Alcance alcance(UsuarioAutenticado actor, TipoReporte tipo, Long id) {
        boolean admin = actor.rol() == Rol.Administrador;
        TipoReporte t = tipo == null ? TipoReporte.global : tipo;
        if (t == TipoReporte.evento) {
            if (id == null) {
                throw new NegocioException(CodigoError.REPORTE_REQUIERE_REFERENCIA);
            }
            Evento e = eventoService.gestionable(id, actor);
            return new Alcance(t, id, e.getNombreEvento());
        }
        if (!admin) {
            if (t == TipoReporte.organizador && id != null && !id.equals(actor.id())) {
                throw new NegocioException(CodigoError.NO_ES_PROPIETARIO);
            }
            return new Alcance(TipoReporte.organizador, actor.id(), nombre(usuarios.findById(actor.id()).orElseThrow()));
        }
        if (t == TipoReporte.organizador) {
            if (id == null) {
                throw new NegocioException(CodigoError.REPORTE_REQUIERE_REFERENCIA);
            }
            Usuario o = usuarios.findById(id).filter(u -> u.getRol() == Rol.Organizador)
                    .orElseThrow(() -> new RecursoNoEncontradoException("Organizador", id));
            return new Alcance(t, id, nombre(o));
        }
        return new Alcance(TipoReporte.global, null, null);
    }

    /** Eventos del alcance y periodo (ev), sus reservaciones confirmadas (res) y sus asistencias vigentes (asi). */
    static String cte(Alcance a, LocalDate desde, LocalDate hasta) {
        StringBuilder w = new StringBuilder("e.estado_evento NOT IN ('Borrador', 'Cancelado')");
        if (a.tipo() == TipoReporte.organizador) {
            w.append(" AND e.id_organizador = :ref");
        } else if (a.tipo() == TipoReporte.evento) {
            w.append(" AND e.id_evento = :ref");
        }
        if (desde != null) {
            w.append(" AND e.fecha_hora_inicio >= :desde");
        }
        if (hasta != null) {
            w.append(" AND e.fecha_hora_inicio < :hasta");
        }
        return """
                WITH ev AS (SELECT e.*, e.fecha_hora_inicio <= now() AS iniciado FROM eventos e WHERE %s),
                     res AS (SELECT r.*, ev.iniciado FROM reservaciones r JOIN ev ON ev.id_evento = r.id_evento
                             WHERE r.estado_reservacion = 'Confirmada'),
                     asi AS (SELECT a.id_reservacion, res.id_evento, res.iniciado FROM asistencias a
                             JOIN res ON res.id_reservacion = a.id_reservacion WHERE NOT a.anulada)
                """.formatted(w);
    }

    static MapSqlParameterSource parametros(Alcance a, LocalDate desde, LocalDate hasta) {
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("zona", ZONA.getId());
        if (a.id() != null) {
            p.addValue("ref", a.id());
        }
        if (desde != null) {
            p.addValue("desde", inicioDelDia(desde));
        }
        if (hasta != null) {
            p.addValue("hasta", inicioDelDia(hasta.plusDays(1)));
        }
        return p;
    }

    static OffsetDateTime inicioDelDia(LocalDate d) {
        return d.atStartOfDay(ZONA).toOffsetDateTime();
    }

    /** Sin periodo, las series cubren los últimos 12 meses. */
    static Ventana ventana(LocalDate desde, LocalDate hasta) {
        LocalDate fin = hasta != null ? hasta : LocalDate.now(ZONA);
        LocalDate inicio = desde != null ? desde : YearMonth.from(fin).minusMonths(11).atDay(1);
        return new Ventana(inicio, fin, ChronoUnit.DAYS.between(inicio, fin) < MAX_DIAS_SERIE_DIARIA);
    }

    /** Reservaciones confirmadas por fecha en que se hicieron. */
    private List<SerieValorResponse> tendencia(String base, MapSqlParameterSource p, Ventana v) {
        return serieAgrupada(base + """
                SELECT to_char(date_trunc(:unidad, fecha_reservacion AT TIME ZONE :zona), :formato) AS etiqueta, count(*) AS valor
                FROM res WHERE fecha_reservacion >= :vDesde AND fecha_reservacion < :vHasta GROUP BY 1""", p, v);
    }

    /** Global: usuarios registrados por mes. Organizador o evento: participantes cuya primera reservación del alcance cae en el mes. */
    private List<SerieValorResponse> registrosPorMes(Alcance a, String base, MapSqlParameterSource p, Ventana v) {
        String consulta = a.tipo() == TipoReporte.global
                ? """
                  SELECT to_char(date_trunc(:unidad, fecha_registro AT TIME ZONE :zona), :formato) AS etiqueta, count(*) AS valor
                  FROM usuarios WHERE fecha_registro >= :vDesde AND fecha_registro < :vHasta GROUP BY 1"""
                : base + """
                  SELECT to_char(date_trunc(:unidad, primera AT TIME ZONE :zona), :formato) AS etiqueta, count(*) AS valor
                  FROM (SELECT id_participante, min(fecha_reservacion) AS primera FROM res GROUP BY id_participante) x
                  WHERE primera >= :vDesde AND primera < :vHasta GROUP BY 1""";
        return serieAgrupada(consulta, p, v);
    }

    /** Ejecuta una consulta «etiqueta, valor» y completa con 0 los días o meses sin datos. */
    private List<SerieValorResponse> serieAgrupada(String consulta, MapSqlParameterSource base, Ventana v) {
        MapSqlParameterSource p = new MapSqlParameterSource(base.getValues())
                .addValue("unidad", v.diaria() ? "day" : "month")
                .addValue("formato", v.diaria() ? "YYYY-MM-DD" : "YYYY-MM")
                .addValue("vDesde", inicioDelDia(v.diaria() ? v.desde() : v.desde().withDayOfMonth(1)))
                .addValue("vHasta", inicioDelDia(v.hasta().plusDays(1)));
        Map<String, Long> valores = new LinkedHashMap<>();
        sql.query(consulta, p, rs -> {
            valores.put(rs.getString("etiqueta"), rs.getLong("valor"));
        });
        List<SerieValorResponse> serie = new ArrayList<>();
        if (v.diaria()) {
            for (LocalDate d = v.desde(); !d.isAfter(v.hasta()); d = d.plusDays(1)) {
                String e = d.format(DIA);
                serie.add(new SerieValorResponse(e, valores.getOrDefault(e, 0L)));
            }
        } else {
            for (YearMonth m = YearMonth.from(v.desde()); !m.isAfter(YearMonth.from(v.hasta())); m = m.plusMonths(1)) {
                String e = m.format(MES);
                serie.add(new SerieValorResponse(e, valores.getOrDefault(e, 0L)));
            }
        }
        return serie;
    }

    private List<ReporteCategoriaResponse> porCategoria(String base, MapSqlParameterSource p) {
        return sql.query(base + """
                SELECT c.nombre AS categoria, count(DISTINCT ev.id_evento) AS eventos,
                       (SELECT count(*) FROM res WHERE res.id_evento IN (SELECT x.id_evento FROM ev x WHERE x.id_categoria = c.id_categoria)) AS reservaciones,
                       (SELECT count(*) FROM asi WHERE asi.id_evento IN (SELECT x.id_evento FROM ev x WHERE x.id_categoria = c.id_categoria)) AS asistencias,
                       (SELECT count(*) FROM res WHERE res.iniciado AND res.id_evento IN (SELECT x.id_evento FROM ev x WHERE x.id_categoria = c.id_categoria)) AS conf_ini,
                       (SELECT count(*) FROM asi WHERE asi.iniciado AND asi.id_evento IN (SELECT x.id_evento FROM ev x WHERE x.id_categoria = c.id_categoria)) AS asi_ini
                FROM ev JOIN categorias c ON c.id_categoria = ev.id_categoria
                GROUP BY c.id_categoria, c.nombre
                ORDER BY reservaciones DESC, c.nombre""", p, (rs, i) -> new ReporteCategoriaResponse(rs.getString("categoria"),
                rs.getLong("eventos"), rs.getLong("reservaciones"), rs.getLong("asistencias"), tasa(rs.getLong("asi_ini"), rs.getLong("conf_ini"))));
    }

    private List<ReporteEventoResponse> topEventos(String base, MapSqlParameterSource p) {
        return sql.query(base + """
                SELECT ev.id_evento, ev.nombre_evento, ev.fecha_hora_inicio, c.nombre AS categoria, ev.cupo_maximo, ev.iniciado,
                       (SELECT count(*) FROM res WHERE res.id_evento = ev.id_evento) AS reservaciones,
                       (SELECT count(*) FROM asi WHERE asi.id_evento = ev.id_evento) AS asistencias,
                       (SELECT coalesce(sum(monto), 0) FROM res WHERE res.id_evento = ev.id_evento) AS ingresos
                FROM ev JOIN categorias c ON c.id_categoria = ev.id_categoria
                ORDER BY asistencias DESC, reservaciones DESC, ev.fecha_hora_inicio DESC
                LIMIT %d""".formatted(TOP_EVENTOS), p, (rs, i) -> {
                    long reservaciones = rs.getLong("reservaciones");
                    long asistencias = rs.getLong("asistencias");
                    return new ReporteEventoResponse(rs.getLong("id_evento"), rs.getString("nombre_evento"),
                            rs.getTimestamp("fecha_hora_inicio").toInstant().atOffset(ZoneOffset.UTC), rs.getString("categoria"),
                            rs.getInt("cupo_maximo"), reservaciones, asistencias,
                            rs.getBoolean("iniciado") ? tasa(asistencias, reservaciones) : 0,
                            rs.getBigDecimal("ingresos").setScale(2, RoundingMode.HALF_UP));
                });
    }

    /** Porcentaje con un decimal; 0 si no hay base. */
    static double tasa(long parte, long total) {
        return total == 0 ? 0 : Math.round(parte * 1000.0 / total) / 10.0;
    }

    private static long num(Map<String, Object> fila, String columna) {
        return ((Number) fila.get(columna)).longValue();
    }

    private static ExportadorTabla.Seccion serie(String titulo, String columna, List<SerieValorResponse> s) {
        return new ExportadorTabla.Seccion(titulo, new String[] {"Periodo", columna}, new float[] {2, 2},
                s.stream().map(x -> new String[] {x.etiqueta(), String.valueOf(Math.round(x.valor()))}).toList());
    }

    private static String descripcion(Alcance a) {
        return switch (a.tipo()) {
            case global -> "global";
            case organizador -> "del organizador " + a.nombre();
            case evento -> "del evento " + a.nombre();
        };
    }

    private static String nombre(Usuario u) {
        return u.getNombres() + " " + u.getApellidos();
    }
}
