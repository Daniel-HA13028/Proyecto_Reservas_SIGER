package com.project.siger.service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.dto.FormatoExportacion;
import com.project.siger.dto.mapper.UsuarioMapper;
import com.project.siger.dto.request.ActualizarUsuarioRequest;
import com.project.siger.dto.request.AprobacionOrganizadorRequest;
import com.project.siger.dto.request.CrearUsuarioRequest;
import com.project.siger.dto.response.PageResponse;
import com.project.siger.dto.response.UsuarioResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.model.enums.Rol;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.model.enums.TipoToken;
import com.project.siger.repository.TokenUsuarioRepository;
import com.project.siger.repository.UsuarioRepository;
import com.project.siger.repository.spec.UsuarioSpecifications;

/** Gestión de usuarios del Administrador (RF-05, RF-06, CU-07, CU-11, RN-04, RN-05; T-04-06). */
@Service
public class UsuarioService {

    static final int LIMITE_MAXIMO = 100;
    static final int MAXIMO_EXPORTACION = 10_000;
    private static final Sort ORDEN = Sort.by(Sort.Order.desc("fechaRegistro"), Sort.Order.desc("id"));
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final UsuarioRepository usuarios;
    private final TokenUsuarioRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final NotificacionService notificaciones;
    private final BitacoraService bitacora;
    private final UsuarioMapper usuarioMapper;
    private final ExportadorUsuarios exportador;

    public UsuarioService(UsuarioRepository usuarios, TokenUsuarioRepository tokens, PasswordEncoder passwordEncoder,
            NotificacionService notificaciones, BitacoraService bitacora, UsuarioMapper usuarioMapper,
            ExportadorUsuarios exportador) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.notificaciones = notificaciones;
        this.bitacora = bitacora;
        this.usuarioMapper = usuarioMapper;
        this.exportador = exportador;
    }

    @Transactional(readOnly = true)
    public PageResponse<UsuarioResponse> listar(String buscar, Rol rol, EstadoCuenta estado, int pagina, int limite) {
        if (pagina < 1 || limite < 1 || limite > LIMITE_MAXIMO) {
            throw new NegocioException(CodigoError.PARAMETRO_INVALIDO,
                    "La página empieza en 1 y el límite debe estar entre 1 y " + LIMITE_MAXIMO + ".");
        }
        Page<Usuario> pag = usuarios.findAll(UsuarioSpecifications.filtrar(buscar, rol, estado),
                PageRequest.of(pagina - 1, limite, ORDEN));
        return new PageResponse<>(pag.map(usuarioMapper::aRespuesta).getContent(), pagina, limite, pag.getTotalPages(),
                pag.getTotalElements());
    }

    /**
     * Alta manual: la cuenta se crea Activa con una contraseña aleatoria que nadie conoce; el usuario recibe un
     * correo de bienvenida y define su contraseña con la recuperación, que además verifica su correo.
     */
    @Transactional
    public UsuarioResponse crear(Long idAdmin, CrearUsuarioRequest solicitud) {
        String correo = AuthService.normalizarCorreo(solicitud.correoElectronico());
        if (usuarios.existsByCorreoElectronico(correo)) {
            throw new NegocioException(CodigoError.CORREO_YA_REGISTRADO);
        }
        Usuario u = new Usuario();
        u.setNombres(solicitud.nombres().trim());
        u.setApellidos(solicitud.apellidos().trim());
        u.setCorreoElectronico(correo);
        u.setFechaNacimiento(solicitud.fechaNacimiento());
        u.setRol(solicitud.rol());
        u.setEstadoCuenta(EstadoCuenta.Activo);
        u.setCorreoVerificado(false);
        u.setContrasenaHash(passwordEncoder.encode(contrasenaAleatoria()));
        usuarios.saveAndFlush(u);

        bitacora.registrar(admin(idAdmin), BitacoraService.CREAR_USUARIO, "usuarios", u.getId(),
                Map.of("correo", correo, "rol", u.getRol().name()));
        notificaciones.notificar(u, null, TipoNotificacion.Bienvenida, "Bienvenido a SIGER",
                "Un administrador creó tu cuenta. Define tu contraseña para entrar.", "bienvenida",
                Map.of("rol", u.getRol().name()));
        return usuarioMapper.aRespuesta(u);
    }

    @Transactional
    public UsuarioResponse actualizar(Long idAdmin, Long id, ActualizarUsuarioRequest solicitud) {
        Usuario u = buscar(id);
        Map<String, Object> cambios = new LinkedHashMap<>();
        String correo = AuthService.normalizarCorreo(solicitud.correoElectronico());
        if (!Objects.equals(correo, u.getCorreoElectronico())) {
            if (usuarios.existsByCorreoElectronico(correo)) {
                throw new NegocioException(CodigoError.CORREO_YA_REGISTRADO);
            }
            cambios.put("correo", Map.of("anterior", u.getCorreoElectronico(), "nuevo", correo));
            u.setCorreoElectronico(correo);
            u.setCorreoVerificado(false);
        }
        anotar(cambios, "nombres", u.getNombres(), solicitud.nombres().trim());
        anotar(cambios, "apellidos", u.getApellidos(), solicitud.apellidos().trim());
        anotar(cambios, "fechaNacimiento", u.getFechaNacimiento(), solicitud.fechaNacimiento());
        u.setNombres(solicitud.nombres().trim());
        u.setApellidos(solicitud.apellidos().trim());
        u.setFechaNacimiento(solicitud.fechaNacimiento());
        if (!cambios.isEmpty()) {
            bitacora.registrar(admin(idAdmin), BitacoraService.EDITAR_USUARIO, "usuarios", u.getId(), cambios);
        }
        return usuarioMapper.aRespuesta(u);
    }

    /** Activar o desactivar. Pendiente solo lo asigna el registro; se resuelve con la aprobación. */
    @Transactional
    public UsuarioResponse cambiarEstado(Long idAdmin, Long id, EstadoCuenta estado) {
        if (estado == EstadoCuenta.Pendiente) {
            throw new NegocioException(CodigoError.ESTADO_CUENTA_NO_PERMITIDO);
        }
        Usuario u = buscar(id);
        if (u.getEstadoCuenta() == EstadoCuenta.Pendiente) {
            throw new NegocioException(CodigoError.ESTADO_CUENTA_NO_PERMITIDO,
                    "La cuenta tiene una solicitud de organizador pendiente: apruébala o recházala.");
        }
        if (id.equals(idAdmin) && estado == EstadoCuenta.Inactivo) {
            throw new NegocioException(CodigoError.AUTODESACTIVACION_NO_PERMITIDA);
        }
        if (u.getEstadoCuenta() != estado) {
            bitacora.registrar(admin(idAdmin), BitacoraService.CAMBIO_ESTADO, "usuarios", u.getId(),
                    Map.of("anterior", u.getEstadoCuenta().name(), "nuevo", estado.name()));
            u.setEstadoCuenta(estado);
            if (estado == EstadoCuenta.Inactivo) {
                // Sin sesiones abiertas; además el filtro JWT rechaza cualquier access token de una cuenta inactiva.
                tokens.invalidar(u.getId(), TipoToken.Refresh);
            }
        }
        return usuarioMapper.aRespuesta(u);
    }

    /** Cambio de rol. Un administrador no puede cambiar su propio rol  */
    @Transactional
    public UsuarioResponse cambiarRol(Long idAdmin, Long id, Rol rol) {
        if (id.equals(idAdmin)) {
            throw new NegocioException(CodigoError.ROL_PROPIO_NO_MODIFICABLE);
        }
        Usuario u = buscar(id);
        if (u.getEstadoCuenta() == EstadoCuenta.Pendiente) {
            throw new NegocioException(CodigoError.ESTADO_CUENTA_NO_PERMITIDO,
                    "La cuenta tiene una solicitud de organizador pendiente: apruébala o recházala.");
        }
        if (u.getRol() != rol) {
            bitacora.registrar(admin(idAdmin), BitacoraService.CAMBIO_ROL, "usuarios", u.getId(),
                    Map.of("anterior", u.getRol().name(), "nuevo", rol.name()));
            u.setRol(rol);
        }
        return usuarioMapper.aRespuesta(u);
    }

    /**
     * Aprobar o rechazar una solicitud de Organizador: aprobada queda Organizador Activo;
     * rechazada queda Participante Activo. Se notifica al usuario por correo.
     */
    @Transactional
    public UsuarioResponse resolverAprobacion(Long idAdmin, Long id, AprobacionOrganizadorRequest solicitud) {
        Usuario u = buscar(id);
        if (u.getEstadoCuenta() != EstadoCuenta.Pendiente) {
            throw new NegocioException(CodigoError.CUENTA_NO_PENDIENTE);
        }
        String motivo = solicitud.motivo() == null ? null : solicitud.motivo().trim();
        u.setEstadoCuenta(EstadoCuenta.Activo);
        if (Boolean.TRUE.equals(solicitud.aprobar())) {
            u.setRol(Rol.Organizador);
            bitacora.registrar(admin(idAdmin), BitacoraService.APROBAR_ORGANIZADOR, "usuarios", u.getId(), Map.of());
            notificaciones.notificar(u, null, TipoNotificacion.Aprobacion_Organizador, "Tu cuenta de organizador fue aprobada",
                    "Tu solicitud de organizador fue aprobada.", "aprobacion_organizador", Map.of());
        } else {
            if (motivo == null || motivo.isEmpty()) {
                throw new NegocioException(CodigoError.MOTIVO_RECHAZO_REQUERIDO);
            }
            u.setRol(Rol.Participante);
            bitacora.registrar(admin(idAdmin), BitacoraService.RECHAZAR_ORGANIZADOR, "usuarios", u.getId(),
                    Map.of("motivo", motivo));
            notificaciones.notificar(u, null, TipoNotificacion.Rechazo_Organizador, "Tu solicitud de organizador no fue aprobada",
                    "Tu solicitud de organizador no fue aprobada: " + motivo, "rechazo_organizador",
                    Map.of("motivo", motivo));
        }
        return usuarioMapper.aRespuesta(u);
    }

    /** Exportación de la lista con los mismos filtros */
    @Transactional
    public ExportadorTabla.Archivo exportar(Long idAdmin, FormatoExportacion formato, String buscar, Rol rol,
            EstadoCuenta estado) {
        Usuario admin = admin(idAdmin);
        List<UsuarioResponse> filas = usuarios.findAll(UsuarioSpecifications.filtrar(buscar, rol, estado),
                PageRequest.of(0, MAXIMO_EXPORTACION, ORDEN)).map(usuarioMapper::aRespuesta).getContent();
        Map<String, Object> filtros = new LinkedHashMap<>();
        if (buscar != null && !buscar.isBlank()) filtros.put("buscar", buscar.trim());
        if (rol != null) filtros.put("rol", rol.name());
        if (estado != null) filtros.put("estado", estado.name());
        bitacora.registrar(admin, BitacoraService.EXPORTAR_USUARIOS, "usuarios", null,
                Map.of("formato", formato.name(), "filas", filas.size(), "filtros", filtros));
        String solicitante = admin.getNombres() + " " + admin.getApellidos() + " (" + admin.getCorreoElectronico() + ")";
        return exportador.exportar(formato, filas, filtros, solicitante);
    }

    private Usuario buscar(Long id) {
        return usuarios.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Usuario", id));
    }

    private Usuario admin(Long idAdmin) {
        return usuarios.getReferenceById(idAdmin);
    }

    private static void anotar(Map<String, Object> cambios, String campo, Object antes, Object despues) {
        if (!Objects.equals(antes, despues)) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("anterior", antes == null ? null : antes.toString());
            c.put("nuevo", despues == null ? null : despues.toString());
            cambios.put(campo, c);
        }
    }

    private static String contrasenaAleatoria() {
        byte[] bytes = new byte[32];
        ALEATORIO.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
}
