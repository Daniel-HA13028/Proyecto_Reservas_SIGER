package com.project.siger.service;

import java.util.Map;
import java.util.Objects;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.dto.mapper.UsuarioMapper;
import com.project.siger.dto.request.ActualizarPerfilRequest;
import com.project.siger.dto.request.CambiarContrasenaRequest;
import com.project.siger.dto.response.UsuarioResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.model.enums.TipoToken;
import com.project.siger.repository.TokenUsuarioRepository;
import com.project.siger.repository.UsuarioRepository;

/** Perfil propio: datos personales, cambio de correo con verificación y cambio de contraseña. */
@Service
public class PerfilService {

    private final UsuarioRepository usuarios;
    private final TokenUsuarioRepository tokens;
    private final TokenUsuarioService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final NotificacionService notificaciones;
    private final BitacoraService bitacora;
    private final UsuarioMapper usuarioMapper;

    public PerfilService(UsuarioRepository usuarios, TokenUsuarioRepository tokens, TokenUsuarioService tokenService,
            PasswordEncoder passwordEncoder, NotificacionService notificaciones, BitacoraService bitacora,
            UsuarioMapper usuarioMapper) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.tokenService = tokenService;
        this.passwordEncoder = passwordEncoder;
        this.notificaciones = notificaciones;
        this.bitacora = bitacora;
        this.usuarioMapper = usuarioMapper;
    }

    @Transactional(readOnly = true)
    public UsuarioResponse obtener(Long idUsuario) {
        return usuarioMapper.aRespuesta(buscar(idUsuario));
    }

    /**
     * Actualiza nombres, apellidos y fecha de nacimiento. Si cambia el correo, envía un enlace al nuevo y el actual
     * se conserva hasta que se confirme (columna correo_nuevo de tokens_usuario).
     */
    @Transactional
    public UsuarioResponse actualizar(Long idUsuario, ActualizarPerfilRequest solicitud) {
        Usuario usuario = buscar(idUsuario);
        usuario.setNombres(solicitud.nombres().trim());
        usuario.setApellidos(solicitud.apellidos().trim());
        usuario.setFechaNacimiento(solicitud.fechaNacimiento());

        String correoNuevo = AuthService.normalizarCorreo(solicitud.correoElectronico());
        if (!Objects.equals(correoNuevo, usuario.getCorreoElectronico())) {
            if (usuarios.existsByCorreoElectronico(correoNuevo)) {
                throw new NegocioException(CodigoError.CORREO_YA_REGISTRADO);
            }
            tokens.invalidar(usuario.getId(), TipoToken.Cambio_Correo);
            String token = tokenService.crear(usuario, TipoToken.Cambio_Correo, AuthService.VIGENCIA_ENLACE, correoNuevo);
            notificaciones.notificar(usuario, correoNuevo, null, TipoNotificacion.Verificacion_Correo,
                    "Confirma tu nuevo correo", "Te enviamos un enlace para confirmar tu nuevo correo.",
                    "cambio_correo", Map.of("token", token));
        }
        return usuarioMapper.aRespuesta(usuario);
    }

    /** Cambia la contraseña con la actual; cierra las demás sesiones abiertas (refresh tokens). */
    @Transactional
    public void cambiarContrasena(Long idUsuario, CambiarContrasenaRequest solicitud) {
        Usuario usuario = buscar(idUsuario);
        if (!passwordEncoder.matches(solicitud.contrasenaActual(), usuario.getContrasenaHash())) {
            throw new NegocioException(CodigoError.CONTRASENA_ACTUAL_INCORRECTA);
        }
        if (!solicitud.nuevaContrasena().equals(solicitud.confirmacionContrasena())) {
            throw new NegocioException(CodigoError.CONTRASENAS_NO_COINCIDEN);
        }
        usuario.setContrasenaHash(passwordEncoder.encode(solicitud.nuevaContrasena()));
        tokens.invalidar(usuario.getId(), TipoToken.Refresh);
        bitacora.registrar(usuario, BitacoraService.CAMBIO_CONTRASENA, "usuarios", usuario.getId(), Map.of("medio", "perfil"));
    }

    private Usuario buscar(Long idUsuario) {
        return usuarios.findById(idUsuario).orElseThrow(() -> new RecursoNoEncontradoException("Usuario", idUsuario));
    }
}
