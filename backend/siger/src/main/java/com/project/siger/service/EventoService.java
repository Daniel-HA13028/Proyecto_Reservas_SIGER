package com.project.siger.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.OrdenCatalogo;
import com.project.siger.dto.mapper.EventoMapper;
import com.project.siger.dto.request.EventoRequest;
import com.project.siger.dto.response.EventoResponse;
import com.project.siger.dto.response.EventoResumenResponse;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Evento;
import com.project.siger.model.Reservacion;
import com.project.siger.model.enums.EstadoEvento;
import com.project.siger.model.enums.EstadoReservacion;
import com.project.siger.model.enums.Rol;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.repository.EventoRepository;
import com.project.siger.repository.ReservacionRepository;
import com.project.siger.repository.UsuarioRepository;
import com.project.siger.repository.spec.EventoSpecifications;

/** Eventos: CRUD, estados, cancelación y catálogo  */
@Service
public class EventoService {

    static final int LIMITE_MAXIMO = 100;
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'a las' HH:mm");

    private final EventoRepository eventos;
    private final ReservacionRepository reservaciones;
    private final UsuarioRepository usuarios;
    private final CategoriaService categorias;
    private final ImagenService imagenes;
    private final NotificacionService notificaciones;
    private final BitacoraService bitacora;
    private final EventoMapper mapper;

    public EventoService(EventoRepository eventos, ReservacionRepository reservaciones, UsuarioRepository usuarios,
            CategoriaService categorias, ImagenService imagenes, NotificacionService notificaciones,
            BitacoraService bitacora, EventoMapper mapper) {
        this.eventos = eventos;
        this.reservaciones = reservaciones;
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.imagenes = imagenes;
        this.notificaciones = notificaciones;
        this.bitacora = bitacora;
        this.mapper = mapper;
    }

    // ------------------------------------------------------------------ Consultas

    /** Catálogo público: solo Publicados que aún no empiezan. */
    @Transactional(readOnly = true)
    public PageResponse<EventoResumenResponse> catalogo(String buscar, Short categoria, LocalDate desde, LocalDate hasta,
            String ubicacion, OrdenCatalogo orden, int pagina, int limite) {
        validarPagina(pagina, limite);
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new NegocioException(CodigoError.PERIODO_INVALIDO);
        }
        Page<Evento> pag = eventos.findAll(EventoSpecifications.catalogo(buscar, categoria, desde, hasta, ubicacion, orden),
                PageRequest.of(pagina - 1, limite));
        return pagina(pag.map(mapper::resumen), pagina, limite);
    }

    /** Detalle. Un Borrador solo lo ven su organizador y los administradores (404 para los demás). */
    @Transactional(readOnly = true)
    public EventoResponse detalle(Long id, UsuarioAutenticado actor) {
        Evento e = buscar(id);
        if (e.getEstadoEvento() == EstadoEvento.Borrador && !puedeGestionar(e, actor)) {
            throw new RecursoNoEncontradoException("Evento", id);
        }
        return mapper.detalle(e);
    }

    /** Eventos del organizador; el Administrador ve todos (pantalla «Gestión de eventos»). Más recientes primero. */
    @Transactional(readOnly = true)
    public PageResponse<EventoResumenResponse> misEventos(UsuarioAutenticado actor, EstadoEvento estado, int pagina, int limite) {
        validarPagina(pagina, limite);
        Long idOrganizador = actor.rol() == Rol.Administrador ? null : actor.id();
        Page<Evento> pag = eventos.findAll(EventoSpecifications.deOrganizador(idOrganizador, estado),
                PageRequest.of(pagina - 1, limite, Sort.by(Sort.Order.desc("fechaHoraInicio"), Sort.Order.desc("id"))));
        return pagina(pag.map(mapper::resumen), pagina, limite);
    }

    // ------------------------------------------------------------------ Cambios

    /** Crear en Borrador. */
    @Transactional
    public EventoResponse crear(UsuarioAutenticado actor, EventoRequest datos, MultipartFile imagen) {
        Evento e = new Evento();
        e.setOrganizador(usuarios.getReferenceById(actor.id()));
        aplicar(e, datos, null);
        e.setCupoDisponible(datos.cupoMaximo());
        e.setEstadoEvento(EstadoEvento.Borrador);
        e.setImagenUrl(imagenes.guardar(imagen));
        eventos.saveAndFlush(e);
        bitacora.registrar(usuarios.getReferenceById(actor.id()), "CREAR_EVENTO", "eventos", e.getId(),
                Map.of("nombre", e.getNombreEvento()));
        return mapper.detalle(buscar(e.getId()));
    }

    /**
     * Editar o reprogramar. Un evento cancelado o finalizado no se modifica. Si un evento
     * publicado cambia fecha, hora o ubicación queda «reprogramado» y se avisa a quienes reservaron.
     */
    @Transactional
    public EventoResponse actualizar(UsuarioAutenticado actor, Long id, EventoRequest datos, MultipartFile imagen) {
        Evento e = gestionable(id, actor);
        if (e.getEstadoEvento() == EstadoEvento.Cancelado || e.getEstadoEvento() == EstadoEvento.Finalizado) {
            throw new NegocioException(CodigoError.EVENTO_NO_EDITABLE);
        }
        int reservados = e.getCupoMaximo() - e.getCupoDisponible();
        if (datos.cupoMaximo() < reservados) {
            throw new NegocioException(CodigoError.CAPACIDAD_MENOR_A_RESERVADOS,
                    "La capacidad no puede ser menor que los " + reservados + " cupos ya reservados.");
        }
        boolean cambioRelevante = !e.getFechaHoraInicio().isEqual(datos.fechaHoraInicio())
                || !e.getFechaHoraFin().isEqual(datos.fechaHoraFin())
                || !Objects.equals(e.getUbicacion(), datos.ubicacion().trim());
        aplicar(e, datos, e.getCategoria().getId());
        e.setCupoDisponible(datos.cupoMaximo() - reservados);
        String nueva = imagenes.guardar(imagen);
        if (nueva != null) {
            imagenes.borrar(e.getImagenUrl());
            e.setImagenUrl(nueva);
        }
        if (cambioRelevante && e.getEstadoEvento() == EstadoEvento.Publicado) {
            e.setReprogramado(true);
            avisarReservados(e, TipoNotificacion.Cambio_Evento, "Cambios en " + e.getNombreEvento(),
                    "El evento cambió de fecha, hora o ubicación.", "cambio_evento", Map.of());
        }
        bitacora.registrar(usuarios.getReferenceById(actor.id()), "EDITAR_EVENTO", "eventos", e.getId(),
                Map.of("reprogramado", cambioRelevante && e.getEstadoEvento() == EstadoEvento.Publicado));
        eventos.flush();
        return mapper.detalle(e);
    }

    /** Publicar: solo desde Borrador y con fecha de inicio futura. */
    @Transactional
    public EventoResponse publicar(UsuarioAutenticado actor, Long id) {
        Evento e = gestionable(id, actor);
        if (e.getEstadoEvento() != EstadoEvento.Borrador) {
            throw new NegocioException(CodigoError.EVENTO_NO_PUBLICABLE);
        }
        if (!e.getFechaHoraInicio().isAfter(OffsetDateTime.now())) {
            throw new NegocioException(CodigoError.FECHAS_EVENTO_INVALIDAS,
                    "La fecha de inicio ya pasó: edita el evento antes de publicarlo.");
        }
        e.setEstadoEvento(EstadoEvento.Publicado);
        bitacora.registrar(usuarios.getReferenceById(actor.id()), "PUBLICAR_EVENTO", "eventos", e.getId(), Map.of());
        return mapper.detalle(e);
    }

    /**
     * Cancelar; diagrama de secuencia C): en la misma transacción el evento queda Cancelado con su
     * motivo y se cancelan sus reservaciones confirmadas; los correos salen después del COMMIT.
     */
    @Transactional
    public EventoResponse cancelar(UsuarioAutenticado actor, Long id, String motivo) {
        Evento e = gestionable(id, actor);
        if (e.getEstadoEvento() == EstadoEvento.Cancelado) {
            throw new NegocioException(CodigoError.EVENTO_YA_CANCELADO);
        }
        if (e.getEstadoEvento() == EstadoEvento.Finalizado) {
            throw new NegocioException(CodigoError.EVENTO_NO_EDITABLE);
        }
        String limpio = motivo.trim();
        e.setEstadoEvento(EstadoEvento.Cancelado);
        e.setMotivoCancelacion(limpio);
        List<Reservacion> confirmadas = reservaciones.findByEventoIdAndEstadoReservacion(id, EstadoReservacion.Confirmada);
        OffsetDateTime ahora = OffsetDateTime.now();
        for (Reservacion r : confirmadas) {
            r.setEstadoReservacion(EstadoReservacion.Cancelada);
            r.setFechaCancelacion(ahora);
            notificaciones.notificar(r.getParticipante(), e, TipoNotificacion.Cancelacion_Evento, "Evento cancelado: " + e.getNombreEvento(),
                    "El evento " + e.getNombreEvento() + " fue cancelado. Motivo: " + limpio, "cancelacion_evento",
                    datosCorreo(e, Map.of("motivo", limpio)));
        }
        bitacora.registrar(usuarios.getReferenceById(actor.id()), "CANCELAR_EVENTO", "eventos", e.getId(),
                Map.of("motivo", limpio, "reservaciones_canceladas", confirmadas.size()));
        return mapper.detalle(e);
    }

    /** Eliminar: solo un Borrador sin reservaciones. */
    @Transactional
    public void eliminar(UsuarioAutenticado actor, Long id) {
        Evento e = gestionable(id, actor);
        if (e.getEstadoEvento() != EstadoEvento.Borrador || reservaciones.existsByEventoId(id)) {
            throw new NegocioException(CodigoError.EVENTO_NO_ELIMINABLE);
        }
        String imagen = e.getImagenUrl();
        bitacora.registrar(usuarios.getReferenceById(actor.id()), "ELIMINAR_EVENTO", "eventos", e.getId(),
                Map.of("nombre", e.getNombreEvento()));
        eventos.delete(e);
        eventos.flush();
        imagenes.borrar(imagen);
    }

    /**pasa a Finalizado los eventos publicados cuyo fin ya llegó (lo llama la tarea programada). */
    @Transactional
    public int finalizarVencidos() {
        return eventos.finalizarVencidos(OffsetDateTime.now());
    }

    // ------------------------------------------------------------------ Apoyo

    /** Evento que el usuario puede gestionar: su organizador o un administrador; si no, 403. */
    @Transactional(readOnly = true)
    public Evento gestionable(Long id, UsuarioAutenticado actor) {
        Evento e = buscar(id);
        if (!puedeGestionar(e, actor)) {
            throw new NegocioException(CodigoError.NO_ES_PROPIETARIO);
        }
        return e;
    }

    static boolean puedeGestionar(Evento e, UsuarioAutenticado actor) {
        return actor != null && (actor.rol() == Rol.Administrador || e.getOrganizador().getId().equals(actor.id()));
    }

    private Evento buscar(Long id) {
        return eventos.findConDetalleById(id).orElseThrow(() -> new RecursoNoEncontradoException("Evento", id));
    }

    /** Copia los datos del formulario y valida RN-06 (la fecha futura la valida @Future en el DTO). */
    private void aplicar(Evento e, EventoRequest d, Short categoriaActual) {
        OffsetDateTime limite = d.fechaLimiteReserva() == null ? d.fechaHoraInicio() : d.fechaLimiteReserva();
        if (!d.fechaHoraFin().isAfter(d.fechaHoraInicio()) || limite.isAfter(d.fechaHoraInicio())) {
            throw new NegocioException(CodigoError.FECHAS_EVENTO_INVALIDAS);
        }
        e.setNombreEvento(d.nombreEvento().trim());
        e.setDescripcion(d.descripcion().trim());
        e.setCategoria(categorias.paraEvento(d.idCategoria(), categoriaActual));
        e.setFechaHoraInicio(d.fechaHoraInicio());
        e.setFechaHoraFin(d.fechaHoraFin());
        e.setFechaLimiteReserva(limite);
        e.setUbicacion(d.ubicacion().trim());
        e.setCupoMaximo(d.cupoMaximo());
        e.setMaxAcompanantes(d.maxAcompanantes());
        e.setPrecio(d.precio());
        e.setRequiereQr(d.requiereQr());
    }

    private void avisarReservados(Evento e, TipoNotificacion tipo, String asunto, String resumen, String plantilla,
            Map<String, Object> extra) {
        for (Reservacion r : reservaciones.findByEventoIdAndEstadoReservacion(e.getId(), EstadoReservacion.Confirmada)) {
            notificaciones.notificar(r.getParticipante(), e, tipo, asunto, resumen, plantilla, datosCorreo(e, extra));
        }
    }

    /** Datos del evento para las plantillas de correo. */
    static Map<String, Object> datosCorreo(Evento e, Map<String, Object> extra) {
        Map<String, Object> m = new LinkedHashMap<>(extra);
        m.put("evento", e.getNombreEvento());
        m.put("idEvento", e.getId());
        m.put("fecha", e.getFechaHoraInicio().atZoneSameInstant(EventoSpecifications.ZONA).format(FECHA));
        m.put("ubicacion", e.getUbicacion());
        return m;
    }

    private static void validarPagina(int pagina, int limite) {
        if (pagina < 1 || limite < 1 || limite > LIMITE_MAXIMO) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO,
                    "La página empieza en 1 y el límite debe estar entre 1 y " + LIMITE_MAXIMO + ".");
        }
    }

    private static <T> PageResponse<T> pagina(Page<T> p, int pagina, int limite) {
        return new PageResponse<>(p.getContent(), pagina, limite, p.getTotalPages(), p.getTotalElements());
    }
}
