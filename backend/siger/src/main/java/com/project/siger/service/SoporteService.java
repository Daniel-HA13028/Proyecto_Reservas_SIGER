package com.project.siger.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.dto.request.CrearSolicitudSoporteRequest;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.SolicitudSoporteResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.SolicitudSoporte;
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

    public SoporteService(SolicitudSoporteRepository solicitudes, UsuarioRepository usuarios, LimitadorSolicitudes limitador,
            BitacoraService bitacora) {
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.limitador = limitador;
        this.bitacora = bitacora;
    }

    @Transactional
    public SolicitudSoporteResponse crear(Long idUsuario, CrearSolicitudSoporteRequest datos) {
        String correo = datos.correoContacto().trim().toLowerCase(Locale.ROOT);
        if (!limitador.permitirSolicitud("soporte", correo, BitacoraService.ipActual())) {
            throw new NegocioException(CodigoError.DEMASIADAS_SOLICITUDES);
        }
        SolicitudSoporte s = new SolicitudSoporte();
        if (idUsuario != null) {
            s.setUsuario(usuarios.getReferenceById(idUsuario));
        }
        s.setCorreoContacto(correo);
        s.setTipo(datos.tipo());
        s.setDescripcion(datos.descripcion().trim());
        return respuesta(solicitudes.saveAndFlush(s));
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
        return respuesta(solicitudes.saveAndFlush(s));
    }

    private static SolicitudSoporteResponse respuesta(SolicitudSoporte s) {
        return new SolicitudSoporteResponse(s.getId(), s.getUsuario() == null ? null : s.getUsuario().getId(), s.getCorreoContacto(),
                s.getTipo(), s.getDescripcion(), s.getEstado(), s.getFechaCreacion());
    }
}
