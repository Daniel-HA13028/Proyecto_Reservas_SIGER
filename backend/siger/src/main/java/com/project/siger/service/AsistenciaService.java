package com.project.siger.service;

import static com.project.siger.service.ExportadorTabla.FECHA_HORA;
import static com.project.siger.service.ExportadorTabla.ZONA;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.FormatoExportacion;
import com.project.siger.dto.response.AsistenciaResponse;
import com.project.siger.dto.response.IngresoIntervaloResponse;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.ParticipanteEventoResponse;
import com.project.siger.dto.response.ResumenAsistenciaResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Asistencia;
import com.project.siger.model.Evento;
import com.project.siger.model.Reservacion;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoReservacion;
import com.project.siger.model.enums.MetodoValidacion;
import com.project.siger.repository.AsistenciaRepository;
import com.project.siger.repository.ReservacionRepository;
import com.project.siger.repository.UsuarioRepository;

/**
 * Control de asistencia. Solo el organizador dueño del evento o un administrador
 * La validación sigue el diagrama de actividades B: el código existe → es de este evento → la reservación está
 * Confirmada → no tiene asistencia vigente.
 */
@Service
public class AsistenciaService {

    static final int LIMITE_MAXIMO = 100;
    static final Duration INTERVALO = Duration.ofMinutes(10);
    /** Intervalos que muestra la gráfica en vivo: las últimas 3 horas con ingresos. */
    static final int MAX_INTERVALOS = 18;
    static final int ULTIMOS = 10;
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    private final EventoService eventoService;
    private final ReservacionRepository reservaciones;
    private final AsistenciaRepository asistencias;
    private final UsuarioRepository usuarios;
    private final BitacoraService bitacora;
    private final ExportadorTabla exportador;

    public AsistenciaService(EventoService eventoService, ReservacionRepository reservaciones, AsistenciaRepository asistencias,
            UsuarioRepository usuarios, BitacoraService bitacora, ExportadorTabla exportador) {
        this.eventoService = eventoService;
        this.reservaciones = reservaciones;
        this.asistencias = asistencias;
        this.usuarios = usuarios;
        this.bitacora = bitacora;
        this.exportador = exportador;
    }

    /** Validar el QR o el código escrito en la entrada. Debe responder en menos de 2 s  */
    @Transactional
    public AsistenciaResponse validarQr(UsuarioAutenticado actor, Long idEvento, String codigo, MetodoValidacion metodo) {
        eventoService.gestionable(idEvento, actor);
        MetodoValidacion m = metodo == null ? MetodoValidacion.QR_Scanner : metodo;
        if (m == MetodoValidacion.Manual_Organizador) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO, "Para marcar sin código usa la lista de participantes.");
        }
        Reservacion r = reservaciones.findByCodigoComprobante(codigo.trim())
                .orElseThrow(() -> new NegocioException(CodigoError.CODIGO_QR_INVALIDO));
        if (!r.getEvento().getId().equals(idEvento)) {
            throw new NegocioException(CodigoError.QR_DE_OTRO_EVENTO,
                    "El comprobante pertenece a otro evento: " + r.getEvento().getNombreEvento() + ".");
        }
        return registrar(actor, r, m);
    }

    /** Marcado manual desde la lista de participantes, por ejemplo si el participante no trae el QR. */
    @Transactional
    public AsistenciaResponse registrarManual(UsuarioAutenticado actor, Long idEvento, Long idReservacion) {
        eventoService.gestionable(idEvento, actor);
        Reservacion r = delEvento(idEvento, idReservacion);
        AsistenciaResponse a = registrar(actor, r, MetodoValidacion.Manual_Organizador);
        bitacora.registrar(usuarios.getReferenceById(actor.id()), "MARCAR_ASISTENCIA", "asistencias", a.idAsistencia(),
                Map.of("id_reservacion", idReservacion, "id_evento", idEvento));
        return a;
    }

    /**
     * Deshacer una marca: solo el mismo día del evento. La asistencia queda anulada, no se borra, y
     * la reservación se puede volver a registrar.
     */
    @Transactional
    public void deshacer(UsuarioAutenticado actor, Long idEvento, Long idReservacion) {
        Evento e = eventoService.gestionable(idEvento, actor);
        delEvento(idEvento, idReservacion);
        Asistencia a = asistencias.findByReservacionIdAndAnuladaFalse(idReservacion)
                .orElseThrow(() -> new NegocioException(CodigoError.ASISTENCIA_NO_REGISTRADA));
        if (!esDiaDelEvento(e)) {
            throw new NegocioException(CodigoError.DESHACER_FUERA_DE_PLAZO);
        }
        Usuario quien = usuarios.getReferenceById(actor.id());
        a.setAnulada(true);
        a.setFechaAnulacion(OffsetDateTime.now());
        a.setAnuladaPor(quien);
        asistencias.save(a);
        bitacora.registrar(quien, "DESHACER_ASISTENCIA", "asistencias", a.getId(),
                Map.of("id_reservacion", idReservacion, "id_evento", idEvento, "metodo", a.getMetodoValidacion().name()));
    }

    /** Lista de participantes con búsqueda por nombre o correo y filtro por asistencia */
    @Transactional(readOnly = true)
    public PageResponse<ParticipanteEventoResponse> participantes(UsuarioAutenticado actor, Long idEvento, String buscar,
            Boolean asistio, int pagina, int limite) {
        if (pagina < 1 || limite < 1 || limite > LIMITE_MAXIMO) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO,
                    "La página empieza en 1 y el límite debe estar entre 1 y " + LIMITE_MAXIMO + ".");
        }
        Evento e = eventoService.gestionable(idEvento, actor);
        Page<Reservacion> pag = reservaciones.findAll(filtro(idEvento, buscar, asistio),
                PageRequest.of(pagina - 1, limite, ORDEN));
        List<ParticipanteEventoResponse> filas = filas(e, pag.getContent());
        return new PageResponse<>(filas, pagina, limite, pag.getTotalPages(), pag.getTotalElements());
    }

    /** Exportar la lista de participantes con los mismos filtros */
    @Transactional
    public ExportadorTabla.Archivo exportar(UsuarioAutenticado actor, Long idEvento, FormatoExportacion formato, String buscar,
            Boolean asistio) {
        Evento e = eventoService.gestionable(idEvento, actor);
        List<ParticipanteEventoResponse> filas = filas(e, reservaciones.findAll(filtro(idEvento, buscar, asistio), ORDEN));
        Map<String, Object> filtros = new LinkedHashMap<>();
        if (buscar != null && !buscar.isBlank()) {
            filtros.put("búsqueda", buscar.trim());
        }
        if (asistio != null) {
            filtros.put("asistencia", asistio ? "asistieron" : "no asistieron");
        }
        long asistentes = filas.stream().filter(ParticipanteEventoResponse::asistio).count();
        Usuario solicitante = usuarios.findById(actor.id()).orElseThrow();
        var archivo = exportador.exportar(formato, new ExportadorTabla.Tabla(
                "SIGER · Participantes de " + e.getNombreEvento(), "Participantes", "participantes_evento_" + e.getId(),
                List.of("Evento: " + e.getFechaHoraInicio().atZoneSameInstant(ZONA).format(FECHA_HORA) + " · " + e.getUbicacion(),
                        "Asistieron " + asistentes + " de " + filas.size() + " reservaciones listadas"),
                new String[] {"Participante", "Correo", "Acompañantes", "Asistió", "Ingreso", "Método"},
                new float[] {3.2f, 3.6f, 1.3f, 1f, 1.9f, 1.8f},
                filas.stream().map(AsistenciaService::valores).toList(), "participantes"), filtros,
                solicitante.getNombres() + " " + solicitante.getApellidos());
        bitacora.registrar(solicitante, "EXPORTAR_PARTICIPANTES", "eventos", e.getId(),
                Map.of("formato", formato.name(), "filas", filas.size()));
        return archivo;
    }

    /** Estadísticas en vivo: asistentes contra registrados, ingresos cada 10 minutos y últimos validados. */
    @Transactional(readOnly = true)
    public ResumenAsistenciaResponse resumen(UsuarioAutenticado actor, Long idEvento) {
        eventoService.gestionable(idEvento, actor);
        int registrados = (int) reservaciones.countByEventoIdAndEstadoReservacion(idEvento, EstadoReservacion.Confirmada);
        int acompanantes = reservaciones.sumarAcompanantes(idEvento, EstadoReservacion.Confirmada).intValue();
        List<Asistencia> vigentes = asistencias.findByReservacionEventoIdAndAnuladaFalseOrderByFechaHoraValidacionDesc(idEvento)
                .stream().filter(a -> a.getReservacion().getEstadoReservacion() == EstadoReservacion.Confirmada).toList();
        int asistentes = vigentes.size();
        double porcentaje = registrados == 0 ? 0 : Math.round(asistentes * 1000.0 / registrados) / 10.0;
        return new ResumenAsistenciaResponse(idEvento, registrados, registrados + acompanantes, asistentes, porcentaje,
                intervalos(vigentes), vigentes.stream().limit(ULTIMOS).map(AsistenciaService::respuesta).toList(),
                OffsetDateTime.now());
    }

    private AsistenciaResponse registrar(UsuarioAutenticado actor, Reservacion r, MetodoValidacion metodo) {
        if (r.getEstadoReservacion() != EstadoReservacion.Confirmada) {
            throw new NegocioException(CodigoError.RESERVACION_NO_CONFIRMADA);
        }
        var previa = asistencias.findByReservacionIdAndAnuladaFalse(r.getId());
        if (previa.isPresent()) {
            throw new NegocioException(CodigoError.ASISTENCIA_YA_REGISTRADA, "Asistencia ya registrada el "
                    + previa.get().getFechaHoraValidacion().atZoneSameInstant(ZONA).format(HORA) + " para "
                    + nombre(r.getParticipante()) + ".");
        }
        Asistencia a = new Asistencia();
        a.setReservacion(r);
        a.setMetodoValidacion(metodo);
        a.setRegistradoPor(usuarios.findById(actor.id()).orElseThrow());
        // Si dos lectores registran la misma reservación a la vez, el índice único parcial rechaza la segunda (409).
        return respuesta(asistencias.saveAndFlush(a));
    }

    private Reservacion delEvento(Long idEvento, Long idReservacion) {
        return reservaciones.findById(idReservacion)
                .filter(r -> r.getEvento().getId().equals(idEvento))
                .orElseThrow(() -> new RecursoNoEncontradoException("Reservación", idReservacion));
    }

    /** hoy (hora de El Salvador) está entre el día de inicio y el de fin del evento. */
    static boolean esDiaDelEvento(Evento e) {
        LocalDate hoy = LocalDate.now(ZONA);
        return !hoy.isBefore(e.getFechaHoraInicio().atZoneSameInstant(ZONA).toLocalDate())
                && !hoy.isAfter(e.getFechaHoraFin().atZoneSameInstant(ZONA).toLocalDate());
    }

    private static final Sort ORDEN = Sort.by("participante.apellidos", "participante.nombres", "id");

    private static Specification<Reservacion> filtro(Long idEvento, String buscar, Boolean asistio) {
        return (raiz, consulta, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.equal(raiz.get("evento").get("id"), idEvento));
            p.add(cb.equal(raiz.get("estadoReservacion"), EstadoReservacion.Confirmada));
            if (buscar != null && !buscar.isBlank()) {
                String patron = "%" + buscar.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                var hcb = (HibernateCriteriaBuilder) cb;
                var u = raiz.get("participante");
                p.add(cb.or(hcb.ilike(cb.concat(cb.concat(u.get("nombres"), " "), u.get("apellidos")), patron, '\\'),
                        hcb.ilike(u.get("correoElectronico"), patron, '\\')));
            }
            if (asistio != null) {
                Subquery<Long> sub = consulta.subquery(Long.class);
                var a = sub.from(Asistencia.class);
                sub.select(a.get("id")).where(cb.equal(a.get("reservacion"), raiz), cb.isFalse(a.get("anulada")));
                p.add(asistio ? cb.exists(sub) : cb.not(cb.exists(sub)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    private List<ParticipanteEventoResponse> filas(Evento e, List<Reservacion> lista) {
        Map<Long, Asistencia> vigentes = lista.isEmpty() ? Map.of()
                : asistencias.findByReservacionIdInAndAnuladaFalse(lista.stream().map(Reservacion::getId).toList()).stream()
                        .collect(Collectors.toMap(a -> a.getReservacion().getId(), Function.identity()));
        boolean hoy = esDiaDelEvento(e);
        return lista.stream().map(r -> {
            Asistencia a = vigentes.get(r.getId());
            Usuario u = r.getParticipante();
            return new ParticipanteEventoResponse(r.getId(), u.getId(), nombre(u), u.getCorreoElectronico(),
                    (int) r.getCantidadAcompanantes(), r.getEstadoReservacion(), a != null,
                    a == null ? null : a.getFechaHoraValidacion(), a == null ? null : a.getMetodoValidacion(), a != null && hoy);
        }).toList();
    }

    private static String[] valores(ParticipanteEventoResponse p) {
        return new String[] {p.nombreCompleto(), p.correoElectronico(), String.valueOf(p.acompanantes()), p.asistio() ? "Sí" : "No",
                p.fechaHoraValidacion() == null ? "—" : p.fechaHoraValidacion().atZoneSameInstant(ZONA).format(FECHA_HORA),
                p.metodoValidacion() == null ? "—" : p.metodoValidacion().name().replace('_', ' ')};
    }

    /** Ingresos por intervalo de 10 minutos, alineados al reloj (10:00, 10:10…), incluidos los intervalos sin ingresos. */
    static List<IngresoIntervaloResponse> intervalos(List<Asistencia> vigentes) {
        if (vigentes.isEmpty()) {
            return List.of();
        }
        Map<OffsetDateTime, Integer> conteo = new LinkedHashMap<>();
        for (Asistencia a : vigentes) {
            conteo.merge(inicioIntervalo(a.getFechaHoraValidacion()), 1, Integer::sum);
        }
        OffsetDateTime ultimo = conteo.keySet().stream().max(OffsetDateTime::compareTo).orElseThrow();
        OffsetDateTime primero = conteo.keySet().stream().min(OffsetDateTime::compareTo).orElseThrow();
        OffsetDateTime desde = primero.isBefore(ultimo.minus(INTERVALO.multipliedBy(MAX_INTERVALOS - 1)))
                ? ultimo.minus(INTERVALO.multipliedBy(MAX_INTERVALOS - 1)) : primero;
        List<IngresoIntervaloResponse> lista = new ArrayList<>();
        for (OffsetDateTime t = desde; !t.isAfter(ultimo); t = t.plus(INTERVALO)) {
            lista.add(new IngresoIntervaloResponse(t, conteo.getOrDefault(t, 0)));
        }
        return lista;
    }

    static OffsetDateTime inicioIntervalo(OffsetDateTime instante) {
        OffsetDateTime utc = instante.withOffsetSameInstant(ZoneOffset.UTC).truncatedTo(ChronoUnit.MINUTES);
        return utc.minusMinutes(utc.getMinute() % INTERVALO.toMinutes());
    }

    private static AsistenciaResponse respuesta(Asistencia a) {
        Reservacion r = a.getReservacion();
        return new AsistenciaResponse(a.getId(), r.getId(), nombre(r.getParticipante()), (int) r.getCantidadAcompanantes(),
                a.getFechaHoraValidacion(), a.getMetodoValidacion(), nombre(a.getRegistradoPor()));
    }

    private static String nombre(Usuario u) {
        return u.getNombres() + " " + u.getApellidos();
    }
}
