package com.project.siger.service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.dto.GrupoReservaciones;
import com.project.siger.dto.mapper.EventoMapper;
import com.project.siger.dto.request.CrearReservacionRequest;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.ReservacionResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Evento;
import com.project.siger.model.Reservacion;
import com.project.siger.model.enums.EstadoEvento;
import com.project.siger.model.enums.EstadoReservacion;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.repository.AsistenciaRepository;
import com.project.siger.repository.EventoRepository;
import com.project.siger.repository.ReservacionRepository;
import com.project.siger.repository.UsuarioRepository;

/** Reservaciones y comprobante QR. */
@Service
public class ReservacionService {

    static final Duration PLAZO_CANCELACION = Duration.ofHours(24);
    static final int LIMITE_MAXIMO = 100;
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final ReservacionRepository reservaciones;
    private final EventoRepository eventos;
    private final UsuarioRepository usuarios;
    private final AsistenciaRepository asistencias;
    private final NotificacionService notificaciones;
    private final QrService qr;
    private final EventoMapper eventoMapper;
    private final ContenidoCorreos contenido;

    public ReservacionService(ReservacionRepository reservaciones, EventoRepository eventos, UsuarioRepository usuarios,
            AsistenciaRepository asistencias, NotificacionService notificaciones, QrService qr, EventoMapper eventoMapper,
            ContenidoCorreos contenido) {
        this.reservaciones = reservaciones;
        this.eventos = eventos;
        this.usuarios = usuarios;
        this.asistencias = asistencias;
        this.notificaciones = notificaciones;
        this.qr = qr;
        this.eventoMapper = eventoMapper;
        this.contenido = contenido;
    }

    /**
     * Reservar. Los cupos se descuentan con un UPDATE condicional, así que no hay
     * sobreventa aunque muchas personas reserven a la vez; el índice único parcial impide una segunda
     * reservación confirmada del mismo participante. El comprobante con el QR se envía después del COMMIT.
     */
    @Transactional
    public ReservacionResponse reservar(Long idParticipante, Long idEvento, CrearReservacionRequest solicitud) {
        Evento evento = eventos.findConDetalleById(idEvento).orElseThrow(() -> new RecursoNoEncontradoException("Evento", idEvento));
        if (evento.getEstadoEvento() != EstadoEvento.Publicado || !OffsetDateTime.now().isBefore(evento.getFechaLimiteReserva())) {
            throw new NegocioException(CodigoError.EVENTO_NO_DISPONIBLE);
        }
        int acompanantes = solicitud.acompanantes();
        if (acompanantes > evento.getMaxAcompanantes()) {
            throw new NegocioException(CodigoError.ACOMPANANTES_EXCEDIDOS,
                    "Este evento admite como máximo " + evento.getMaxAcompanantes() + " acompañante(s).");
        }
        if (reservaciones.existsByEventoIdAndParticipanteIdAndEstadoReservacion(idEvento, idParticipante, EstadoReservacion.Confirmada)) {
            throw new NegocioException(CodigoError.RESERVA_DUPLICADA);
        }
        int cupos = 1 + acompanantes;
        if (eventos.descontarCupos(idEvento, cupos) == 0) {
            // El UPDATE no encontró cupo suficiente (o el evento cambió de estado en este instante).
            throw new NegocioException(CodigoError.CUPO_AGOTADO);
        }
        Evento actualizado = eventos.findConDetalleById(idEvento).orElseThrow();
        Reservacion r = new Reservacion();
        r.setEvento(actualizado);
        r.setParticipante(usuarios.getReferenceById(idParticipante));
        r.setCantidadAcompanantes((short) acompanantes);
        r.setObservaciones(solicitud.observaciones() == null || solicitud.observaciones().isBlank() ? null : solicitud.observaciones().trim());
        r.setMonto(actualizado.getPrecio().multiply(BigDecimal.valueOf(cupos)));
        r.setCodigoComprobante(nuevoCodigo());
        try {
            reservaciones.saveAndFlush(r);
        } catch (DataIntegrityViolationException e) {
            // Dos reservaciones del mismo participante a la vez: el índice único rechaza la segunda y la transacción
            // se revierte, devolviendo también los cupos descontados.
            throw new NegocioException(CodigoError.RESERVA_DUPLICADA);
        }
        var participante = usuarios.findById(idParticipante).orElseThrow();
        notificaciones.notificar(participante, actualizado, TipoNotificacion.Confirmacion_Reserva,
                "Reservación confirmada: " + actualizado.getNombreEvento(),
                "Tu reservación para " + actualizado.getNombreEvento() + " está confirmada.", "confirmacion_reserva",
                contenido.comprobante(r), contenido.qr(r));
        return respuesta(r, false);
    }

    /** Mis reservaciones: próximas, pasadas (con asistencia) y canceladas. */
    @Transactional(readOnly = true)
    public PageResponse<ReservacionResponse> mias(Long idParticipante, GrupoReservaciones grupo, int pagina, int limite) {
        if (pagina < 1 || limite < 1 || limite > LIMITE_MAXIMO) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO,
                    "La página empieza en 1 y el límite debe estar entre 1 y " + LIMITE_MAXIMO + ".");
        }
        OffsetDateTime ahora = OffsetDateTime.now();
        Specification<Reservacion> deParticipante = (raiz, consulta, cb) -> cb.equal(raiz.get("participante").get("id"), idParticipante);
        Specification<Reservacion> filtro;
        Sort orden;
        switch (grupo) {
            case proximas -> {
                filtro = deParticipante.and((raiz, consulta, cb) -> cb.and(
                        cb.equal(raiz.get("estadoReservacion"), EstadoReservacion.Confirmada),
                        cb.greaterThan(raiz.get("evento").get("fechaHoraInicio"), ahora)));
                orden = Sort.by(Sort.Order.asc("evento.fechaHoraInicio"));
            }
            case pasadas -> {
                filtro = deParticipante.and((raiz, consulta, cb) -> cb.and(
                        cb.equal(raiz.get("estadoReservacion"), EstadoReservacion.Confirmada),
                        cb.lessThanOrEqualTo(raiz.get("evento").get("fechaHoraInicio"), ahora)));
                orden = Sort.by(Sort.Order.desc("evento.fechaHoraInicio"));
            }
            default -> {
                filtro = deParticipante.and((raiz, consulta, cb) -> cb.equal(raiz.get("estadoReservacion"), EstadoReservacion.Cancelada));
                orden = Sort.by(Sort.Order.desc("fechaCancelacion"));
            }
        }
        Page<Reservacion> pag = reservaciones.findAll(filtro, PageRequest.of(pagina - 1, limite, orden.and(Sort.by(Sort.Order.desc("id")))));
        Set<Long> conAsistencia = grupo != GrupoReservaciones.pasadas || pag.isEmpty() ? Set.of()
                : asistencias.reservacionesConAsistencia(pag.getContent().stream().map(Reservacion::getId).toList());
        return new PageResponse<>(pag.map(r -> respuesta(r, conAsistencia.contains(r.getId()))).getContent(), pagina, limite,
                pag.getTotalPages(), pag.getTotalElements());
    }

    /** Comprobante. Solo su participante; para cualquier otro no existe. */
    @Transactional(readOnly = true)
    public ReservacionResponse detalle(Long idParticipante, Long id) {
        Reservacion r = propia(idParticipante, id);
        return respuesta(r, asistencias.existsVigente(r.getId()));
    }

    @Transactional(readOnly = true)
    public byte[] qr(Long idParticipante, Long id) {
        return qr.png(propia(idParticipante, id).getCodigoComprobante());
    }

    /** Cancelar: solo con al menos 24 h de anticipación; devuelve los cupos. */
    @Transactional
    public ReservacionResponse cancelar(Long idParticipante, Long id) {
        Reservacion r = propia(idParticipante, id);
        if (r.getEstadoReservacion() == EstadoReservacion.Cancelada) {
            throw new NegocioException(CodigoError.RESERVACION_YA_CANCELADA);
        }
        Evento e = r.getEvento();
        if (!cancelable(r)) {
            throw new NegocioException(CodigoError.CANCELACION_FUERA_DE_PLAZO);
        }
        r.setEstadoReservacion(EstadoReservacion.Cancelada);
        r.setFechaCancelacion(OffsetDateTime.now());
        reservaciones.saveAndFlush(r);
        eventos.devolverCupos(e.getId(), 1 + r.getCantidadAcompanantes());
        Reservacion actualizada = reservaciones.findById(id).orElseThrow();
        notificaciones.notificar(actualizada.getParticipante(), actualizada.getEvento(), TipoNotificacion.Cancelacion_Reserva,
                "Reservación cancelada: " + actualizada.getEvento().getNombreEvento(),
                "Cancelaste tu reservación para " + actualizada.getEvento().getNombreEvento() + ".", "cancelacion_reserva",
                EventoService.datosCorreo(actualizada.getEvento(), Map.of()));
        return respuesta(actualizada, false);
    }

    private Reservacion propia(Long idParticipante, Long id) {
        return reservaciones.findById(id)
                .filter(r -> r.getParticipante().getId().equals(idParticipante))
                .orElseThrow(() -> new RecursoNoEncontradoException("Reservación", id));
    }

   
    static boolean cancelable(Reservacion r) {
        return r.getEstadoReservacion() == EstadoReservacion.Confirmada
                && !OffsetDateTime.now().plus(PLAZO_CANCELACION).isAfter(r.getEvento().getFechaHoraInicio());
    }

    private ReservacionResponse respuesta(Reservacion r, boolean asistio) {
        return new ReservacionResponse(r.getId(), eventoMapper.resumen(r.getEvento()), (int) r.getCantidadAcompanantes(),
                r.getObservaciones(), r.getMonto(), r.getCodigoComprobante(), r.getEstadoReservacion(), r.getFechaReservacion(),
                r.getFechaCancelacion(), asistio, cancelable(r));
    }

    /** Código del comprobante: 192 bits aleatorios en Base64 URL (32 caracteres), imposible de adivinar. */
    static String nuevoCodigo() {
        byte[] bytes = new byte[24];
        ALEATORIO.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
