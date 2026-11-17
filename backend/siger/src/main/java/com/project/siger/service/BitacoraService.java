package com.project.siger.service;

import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import com.project.siger.model.Bitacora;
import com.project.siger.model.Usuario;
import com.project.siger.repository.BitacoraRepository;

/** Bitácora de acciones relevantes. Se escribe en la misma transacción que la acción. */
@Service
public class BitacoraService {

    public static final String LOGIN = "LOGIN";
    public static final String CAMBIO_CONTRASENA = "CAMBIO_CONTRASENA";
    public static final String CREAR_USUARIO = "CREAR_USUARIO";
    public static final String EDITAR_USUARIO = "EDITAR_USUARIO";
    public static final String CAMBIO_ROL = "CAMBIO_ROL";
    public static final String CAMBIO_ESTADO = "CAMBIO_ESTADO";
    public static final String APROBAR_ORGANIZADOR = "APROBAR_ORGANIZADOR";
    public static final String RECHAZAR_ORGANIZADOR = "RECHAZAR_ORGANIZADOR";
    public static final String CAMBIO_CORREO = "CAMBIO_CORREO";
    public static final String EXPORTAR_USUARIOS = "EXPORTAR_USUARIOS";

    private final BitacoraRepository bitacora;

    public BitacoraService(BitacoraRepository bitacora) {
        this.bitacora = bitacora;
    }

    /** Registra la acción de «actor» sobre una entidad; la IP se toma de la petición en curso. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void registrar(Usuario actor, String accion, String entidad, Long idEntidad, Map<String, Object> detalle) {
        Bitacora b = new Bitacora();
        b.setUsuario(actor);
        b.setAccion(accion);
        b.setEntidad(entidad);
        b.setIdEntidad(idEntidad);
        b.setDetalle(detalle == null || detalle.isEmpty() ? null : detalle);
        b.setIp(ipActual());
        bitacora.save(b);
    }

    static String ipActual() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
            String ip = atributos.getRequest().getRemoteAddr();
            return ip != null && ip.length() > 45 ? ip.substring(0, 45) : ip;
        }
        return null;
    }
}
