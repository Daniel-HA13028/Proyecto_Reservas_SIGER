package com.project.siger.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.dto.request.CrearSolicitudSoporteRequest;
import com.project.siger.dto.request.ResponderSolicitudRequest;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.SolicitudSoporteResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.SolicitudSoporte;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoSolicitudSoporte;
import com.project.siger.model.enums.TipoSolicitudSoporte;
import com.project.siger.repository.SolicitudSoporteRepository;
import com.project.siger.repository.UsuarioRepository;

/**
 * Soporte técnico. Cualquiera puede reportar un problema (con sesión queda asociado a su
 * cuenta); el límite por correo y por IP evita el abuso del formulario público. El administrador lo atiende:
 * Abierta → En_Proceso → Cerrada (también Abierta → Cerrada); una solicitud cerrada ya no cambia.
 */
@Service
public class SoporteService {

    static final int LIMITE_MAXIMO = 100;

    private final SolicitudSoporteRepository solicitudes;
    private final UsuarioRepository usuarios;
    private final LimitadorSolicitudes limitador;
    private final BitacoraService bitacora;
    private final ApplicationEventPublisher eventos;

    public SoporteService(SolicitudSoporteRepository solicitudes, UsuarioRepository usuarios, LimitadorSolicitudes limitador,
            BitacoraService bitacora, ApplicationEventPublisher eventos) {
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.limitador = limitador;
        this.bitacora = bitacora;
        this.eventos = eventos;
    }

    @Transactional
    public SolicitudSoporteResponse crear(Long idUsuario, CrearSolicitudSoporteRequest datos) {
        String correo = datos.correoContacto().trim().toLowerCase(Locale.ROOT);
        if (!limitador.permitirSolicitud("soporte", correo, BitacoraService.ipActual())) {
            throw new NegocioException(CodigoError.DEMASIADAS_SOLICITUDES);
        }
        SolicitudSoporte s = new SolicitudSoporte();
        String nombre = null;
        if (idUsuario != null) {
            Usuario u = usuarios.findById(idUsuario).orElseThrow(() -> new RecursoNoEncontradoException("Usuario", idUsuario));
            s.setUsuario(u);
            nombre = u.getNombres() + " " + u.getApellidos() + " (" + u.getCorreoElectronico() + ")";
        }
        s.setCorreoContacto(correo);
        s.setTipo(datos.tipo());
        s.setDescripcion(datos.descripcion().trim());
        SolicitudSoporteResponse creada = respuesta(solicitudes.saveAndFlush(s));
        // Aviso al buzón de soporte y acuse a quien la reportó, solo si la transacción se confirma.
        eventos.publishEvent(new SoporteCorreosListener.SolicitudCreada(creada, nombre));
        return creada;
    }

    /** Solicitudes de la más reciente a la más antigua, con filtros de estado y tipo. */
    @Transactional(readOnly = true)
    public PageResponse<SolicitudSoporteResponse> listar(EstadoSolicitudSoporte estado, TipoSolicitudSoporte tipo, int pagina, int limite) {
        if (pagina < 1 || limite < 1 || limite > LIMITE_MAXIMO) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO,
                    "La página empieza en 1 y el límite debe estar entre 1 y " + LIMITE_MAXIMO + ".");
        }
        Specification<SolicitudSoporte> filtro = (raiz, consulta, cb) -> {
            List<jakarta.persistence.criteria.Predicate> p = new ArrayList<>();
            if (estado != null) {
                p.add(cb.equal(raiz.get("estado"), estado));
            }
            if (tipo != null) {
                p.add(cb.equal(raiz.get("tipo"), tipo));
            }
            return cb.and(p.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
        Page<SolicitudSoporte> pag = solicitudes.findAll(filtro,
                PageRequest.of(pagina - 1, limite, Sort.by(Sort.Order.desc("fechaCreacion"), Sort.Order.desc("id"))));
        return new PageResponse<>(pag.map(SoporteService::respuesta).getContent(), pagina, limite, pag.getTotalPages(),
                pag.getTotalElements());
    }

    @Transactional
    public SolicitudSoporteResponse cambiarEstado(Long idAdmin, Long id, EstadoSolicitudSoporte nuevo) {
        SolicitudSoporte s = solicitudes.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Solicitud", id));
        if (nuevo == EstadoSolicitudSoporte.Abierta) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO, "El estado puede cambiar a En_Proceso o Cerrada.");
        }
        if (s.getEstado() == EstadoSolicitudSoporte.Cerrada) {
            throw new NegocioException(CodigoError.SOLICITUD_CERRADA);
        }
        EstadoSolicitudSoporte anterior = s.getEstado();
        s.setEstado(nuevo);
        bitacora.registrar(usuarios.getReferenceById(idAdmin), "CAMBIO_ESTADO_SOPORTE", "solicitudes_soporte", s.getId(),
                Map.of("anterior", anterior.name(), "nuevo", nuevo.name()));
        SolicitudSoporteResponse actualizada = respuesta(solicitudes.saveAndFlush(s));
        if (nuevo != anterior) {
            eventos.publishEvent(new SoporteCorreosListener.EstadoCambiado(actualizada));
        }
        return actualizada;
    }

    /**
     * Respuesta del administrador: se envía por correo a quien reportó el problema (plantilla soporte_respuesta, firmada
     * por el Equipo Soporte SIGER) y la solicitud pasa a En_Proceso, o a Cerrada si «cerrar». El texto queda en la bitácora.
     */
    @Transactional
    public SolicitudSoporteResponse responder(Long idAdmin, Long id, ResponderSolicitudRequest datos) {
        SolicitudSoporte s = solicitudes.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Solicitud", id));
        if (s.getEstado() == EstadoSolicitudSoporte.Cerrada) {
            throw new NegocioException(CodigoError.SOLICITUD_CERRADA);
        }
        String mensaje = datos.mensaje().strip();
        EstadoSolicitudSoporte anterior = s.getEstado();
        s.setEstado(datos.cerrar() ? EstadoSolicitudSoporte.Cerrada : EstadoSolicitudSoporte.En_Proceso);
        bitacora.registrar(usuarios.getReferenceById(idAdmin), "RESPUESTA_SOPORTE", "solicitudes_soporte", s.getId(),
                Map.of("anterior", anterior.name(), "nuevo", s.getEstado().name(), "mensaje", mensaje));
        SolicitudSoporteResponse actualizada = respuesta(solicitudes.saveAndFlush(s));
        // Un solo correo: la respuesta ya informa el nuevo estado, así que no se envía también el aviso de cambio de estado.
        eventos.publishEvent(new SoporteCorreosListener.RespuestaEnviada(actualizada, mensaje));
        return actualizada;
    }

    private static SolicitudSoporteResponse respuesta(SolicitudSoporte s) {
        return new SolicitudSoporteResponse(s.getId(), s.getUsuario() == null ? null : s.getUsuario().getId(), s.getCorreoContacto(),
                s.getTipo(), s.getDescripcion(), s.getEstado(), s.getFechaCreacion());
    }
}
