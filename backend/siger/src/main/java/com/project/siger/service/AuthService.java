package com.project.siger.service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.config.JwtProperties;
import com.project.siger.config.JwtService;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.mapper.UsuarioMapper;
import com.project.siger.dto.request.LoginRequest;
import com.project.siger.dto.request.RegistroRequest;
import com.project.siger.dto.request.RestablecerContrasenaRequest;
import com.project.siger.dto.response.AuthResponse;
import com.project.siger.dto.response.UsuarioResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.model.TokenUsuario;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.model.enums.Rol;
import com.project.siger.model.enums.TipoNotificacion;
import com.project.siger.model.enums.TipoToken;
import com.project.siger.repository.TokenUsuarioRepository;
import com.project.siger.repository.UsuarioRepository;

/** Registro, inicio de sesión, verificación de correo y recuperación de contraseña  */
@Service
public class AuthService {

    static final Duration VIGENCIA_CODIGO = Duration.ofMinutes(15);
    static final int MAX_INTENTOS_CODIGO = 5;
    static final Duration VIGENCIA_ENLACE = Duration.ofHours(24);

    private final UsuarioRepository usuarios;
    private final TokenUsuarioRepository tokens;
    private final TokenUsuarioService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final LimitadorSolicitudes limitador;
    private final BitacoraService bitacora;
    private final NotificacionService notificaciones;
    private final UsuarioMapper usuarioMapper;
    private final ApplicationEventPublisher eventos;
    /** hash del refresh token rotado → momento de la rotación (periodo de gracia, ver refrescar). */
    private final java.util.Map<String, java.time.Instant> rotacionesRecientes = new java.util.concurrent.ConcurrentHashMap<>();

    public AuthService(UsuarioRepository usuarios, TokenUsuarioRepository tokens, TokenUsuarioService tokenService,
            PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager, JwtService jwtService,
            JwtProperties jwtProperties, LimitadorSolicitudes limitador, BitacoraService bitacora,
            NotificacionService notificaciones, UsuarioMapper usuarioMapper, ApplicationEventPublisher eventos) {
        this.usuarios = usuarios;
        this.tokens = tokens;
        this.tokenService = tokenService;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.limitador = limitador;
        this.bitacora = bitacora;
        this.notificaciones = notificaciones;
        this.usuarioMapper = usuarioMapper;
        this.eventos = eventos;
    }

    // ------------------------------------------------------------------ Registro 

    /**
     * Registra una cuenta. Un Organizador queda Pendiente hasta que un Administrador lo apruebe;
     * un Participante queda Activo. En ambos casos el correo queda sin verificar hasta usar el enlace.
     */
    @Transactional
    public UsuarioResponse registrar(RegistroRequest solicitud) {
        if (solicitud.rol() != Rol.Participante && solicitud.rol() != Rol.Organizador) {
            throw new NegocioException(CodigoError.ROL_NO_PERMITIDO_EN_REGISTRO);
        }
        if (!solicitud.contrasena().equals(solicitud.confirmacionContrasena())) {
            throw new NegocioException(CodigoError.CONTRASENAS_NO_COINCIDEN);
        }
        String correo = normalizarCorreo(solicitud.correoElectronico());
        // Comprobación previa para un mensaje claro; si dos registros llegan a la vez,
        // uq_usuarios_correo_electronico rechaza el segundo con el mismo código (RestriccionBd).
        if (usuarios.existsByCorreoElectronico(correo)) {
            throw new NegocioException(CodigoError.CORREO_YA_REGISTRADO);
        }

        Usuario usuario = new Usuario();
        usuario.setNombres(solicitud.nombres().trim());
        usuario.setApellidos(solicitud.apellidos().trim());
        usuario.setCorreoElectronico(correo);
        usuario.setContrasenaHash(passwordEncoder.encode(solicitud.contrasena()));
        usuario.setFechaNacimiento(solicitud.fechaNacimiento());
        usuario.setRol(solicitud.rol());
        usuario.setEstadoCuenta(solicitud.rol() == Rol.Organizador ? EstadoCuenta.Pendiente : EstadoCuenta.Activo);
        usuario.setCorreoVerificado(false);
        usuarios.saveAndFlush(usuario);

        eventos.publishEvent(new UsuarioRegistradoEvent(usuario.getId(), correo));
        return usuarioMapper.aRespuesta(usuario);
    }

    // ------------------------------------------------------------------ Sesión 

    /**
     * Inicio de sesión. Primero se comprueba la contraseña y después el estado, para no
     * revelar si una cuenta existe a quien no conoce su contraseña. 5 fallos en 15 minutos bloquean el correo.
     */
    @Transactional
    public AuthResponse login(LoginRequest solicitud) {
        String correo = normalizarCorreo(solicitud.correoElectronico());
        if (limitador.loginBloqueado(correo)) {
            throw new NegocioException(CodigoError.INTENTOS_EXCEDIDOS);
        }
        UsuarioAutenticado autenticado;
        try {
            autenticado = (UsuarioAutenticado) authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(correo, solicitud.contrasena()))
                    .getPrincipal();
        } catch (AuthenticationException e) {
            limitador.registrarFalloLogin(correo);
            throw new NegocioException(CodigoError.CREDENCIALES_INVALIDAS);
        }
        if (autenticado.estado() == EstadoCuenta.Pendiente) {
            throw new NegocioException(CodigoError.CUENTA_PENDIENTE);
        }
        if (autenticado.estado() == EstadoCuenta.Inactivo) {
            throw new NegocioException(CodigoError.CUENTA_INACTIVA);
        }
        limitador.reiniciarLogin(correo);

        Usuario usuario = usuarios.getReferenceById(autenticado.id());
        usuario.setUltimoAcceso(OffsetDateTime.now());
        bitacora.registrar(usuario, BitacoraService.LOGIN, "usuarios", usuario.getId(),
                Map.of("recordarme", solicitud.recordarme()));
        Duration vigencia = solicitud.recordarme() ? jwtProperties.refreshRecordarme() : jwtProperties.refresh();
        return emitirSesion(usuario, vigencia);
    }

    /**
     * Renueva la sesión con el refresh token y lo rota: el usado queda invalidado. Si alguien presenta un refresh token
     * ya usado (posible robo), se cierran todas las sesiones de esa cuenta; salvo que llegue dentro del periodo de gracia
     * tras su rotación (la respuesta anterior se perdió o la página se recargó), en cuyo caso se entrega otra sesión.
     */
    @Transactional(noRollbackFor = NegocioException.class)
    public AuthResponse refrescar(String refreshToken) {
        String hash = TokenUsuarioService.sha256(refreshToken);
        TokenUsuario token = tokens.findByTokenHashAndTipo(hash, TipoToken.Refresh)
                .orElseThrow(() -> new NegocioException(CodigoError.SESION_NO_VALIDA));
        Usuario usuario = token.getUsuario();
        java.time.Instant ahora = java.time.Instant.now();
        rotacionesRecientes.values().removeIf(t -> t.plus(jwtProperties.graciaReutilizacion()).isBefore(ahora));
        // La gracia no aplica si las sesiones se cerraron entretanto (cambio de contraseña, desactivación).
        if (token.isUsado() && rotacionesRecientes.containsKey(hash) && usuario.getEstadoCuenta() == EstadoCuenta.Activo
                && tokens.existsByUsuarioIdAndTipoAndUsadoFalseAndFechaExpiracionAfter(usuario.getId(), TipoToken.Refresh,
                        OffsetDateTime.now())) {
            return emitirSesion(usuario, Duration.between(token.getFechaCreacion(), token.getFechaExpiracion()));
        }
        if (token.isUsado()) {
            tokens.invalidar(usuario.getId(), TipoToken.Refresh);
            throw new NegocioException(CodigoError.SESION_NO_VALIDA);
        }
        if (token.getFechaExpiracion().isBefore(OffsetDateTime.now())) {
            token.setUsado(true);
            throw new NegocioException(CodigoError.SESION_EXPIRADA);
        }
        if (usuario.getEstadoCuenta() != EstadoCuenta.Activo) {
            tokens.invalidar(usuario.getId(), TipoToken.Refresh);
            throw new NegocioException(CodigoError.SESION_NO_VALIDA);
        }
        token.setUsado(true);
        rotacionesRecientes.put(hash, ahora);
        // La sesión renovada conserva la duración original (normal o «Recordarme»).
        Duration vigencia = Duration.between(token.getFechaCreacion(), token.getFechaExpiracion());
        return emitirSesion(usuario, vigencia);
    }

    /** Cierra la sesión invalidando su refresh token (solo si pertenece al usuario autenticado). */
    @Transactional
    public void logout(Long idUsuario, String refreshToken) {
        tokens.findByTokenHashAndTipo(TokenUsuarioService.sha256(refreshToken), TipoToken.Refresh)
                .filter(t -> t.getUsuario().getId().equals(idUsuario))
                .ifPresent(t -> t.setUsado(true));
    }

    private AuthResponse emitirSesion(Usuario usuario, Duration vigenciaRefresh) {
        String refresh = tokenService.crear(usuario, TipoToken.Refresh, vigenciaRefresh, null);
        return new AuthResponse(jwtService.generarAcceso(usuario), refresh, "Bearer", jwtService.segundosDeAcceso(),
                usuarioMapper.aRespuesta(usuario));
    }

    // ------------------------------------------------------------------ Verificación de correo

    /** Envía el enlace de verificación de una cuenta (registro y reenvío) */
    @Transactional
    public void enviarVerificacion(Usuario usuario) {
        tokens.invalidar(usuario.getId(), TipoToken.Verificacion_Correo);
        String token = tokenService.crear(usuario, TipoToken.Verificacion_Correo, VIGENCIA_ENLACE, null);
        notificaciones.notificar(usuario, null, TipoNotificacion.Verificacion_Correo, "Verifica tu correo",
                "Te enviamos un enlace para verificar tu correo.", "verificacion_correo", Map.of("token", token));
    }

    /** Confirma el correo del registro o el correo nuevo del perfil */
    @Transactional
    public void verificarCorreo(String valor) {
        TokenUsuario token = tokens.findByTokenHashAndTipoIn(TokenUsuarioService.sha256(valor),
                        List.of(TipoToken.Verificacion_Correo, TipoToken.Cambio_Correo))
                .filter(t -> !t.isUsado())
                .orElseThrow(() -> new NegocioException(CodigoError.ENLACE_VERIFICACION_INVALIDO));
        if (token.getFechaExpiracion().isBefore(OffsetDateTime.now())) {
            throw new NegocioException(CodigoError.ENLACE_VERIFICACION_VENCIDO);
        }
        Usuario usuario = token.getUsuario();
        if (token.getTipo() == TipoToken.Cambio_Correo) {
            if (usuarios.existsByCorreoElectronico(token.getCorreoNuevo())) {
                throw new NegocioException(CodigoError.CORREO_YA_REGISTRADO);
            }
            String anterior = usuario.getCorreoElectronico();
            usuario.setCorreoElectronico(token.getCorreoNuevo());
            bitacora.registrar(usuario, BitacoraService.CAMBIO_CORREO, "usuarios", usuario.getId(),
                    Map.of("anterior", anterior, "nuevo", token.getCorreoNuevo()));
        }
        usuario.setCorreoVerificado(true);
        token.setUsado(true);
    }

    /** Reenvía el enlace si la cuenta existe y no está verificada; responde igual en cualquier caso*/
    @Transactional
    public void reenviarVerificacion(String correoSolicitado, String ip) {
        String correo = normalizarCorreo(correoSolicitado);
        if (!limitador.permitirSolicitud("verificacion", correo, ip)) {
            throw new NegocioException(CodigoError.DEMASIADAS_SOLICITUDES);
        }
        usuarios.findByCorreoElectronico(correo)
                .filter(u -> !u.isCorreoVerificado() && u.getEstadoCuenta() != EstadoCuenta.Inactivo)
                .ifPresent(this::enviarVerificacion);
    }

    // ------------------------------------------------------------------ Recuperación de contraseña 

    /**
     * Paso 1: si la cuenta existe y está Activa, invalida los códigos anteriores y envía uno
     * nuevo de 6 dígitos válido 15 minutos. Responde igual exista o no el correo.
     */
    @Transactional
    public void recuperar(String correoSolicitado, String ip) {
        String correo = normalizarCorreo(correoSolicitado);
        if (!limitador.permitirSolicitud("recuperacion", correo, ip)) {
            throw new NegocioException(CodigoError.DEMASIADAS_SOLICITUDES);
        }
        usuarios.findByCorreoElectronico(correo)
                .filter(u -> u.getEstadoCuenta() == EstadoCuenta.Activo)
                .ifPresent(u -> {
                    tokens.invalidar(u.getId(), TipoToken.Recuperacion_Contrasena);
                    String codigo = TokenUsuarioService.codigoSeisDigitos();
                    TokenUsuario t = new TokenUsuario();
                    t.setUsuario(u);
                    t.setTipo(TipoToken.Recuperacion_Contrasena);
                    t.setTokenHash(passwordEncoder.encode(codigo));
                    t.setFechaExpiracion(OffsetDateTime.now().plus(VIGENCIA_CODIGO));
                    tokens.save(t);
                    notificaciones.notificar(u, null, TipoNotificacion.Recuperacion_Contrasena,
                            "Código para restablecer tu contraseña",
                            "Te enviamos un código de 6 dígitos para restablecer tu contraseña.",
                            "recuperacion_contrasena", Map.of("codigo", codigo));
                });
    }

    /** Paso 2: comprueba el código sin consumirlo. Cada fallo suma un intento, aunque la respuesta sea un error. */
    @Transactional(noRollbackFor = NegocioException.class)
    public void verificarCodigo(String correo, String codigo) {
        validarCodigo(normalizarCorreo(correo), codigo);
    }

    /** Paso 3: guarda la nueva contraseña, consume el código y cierra las sesiones abiertas. */
    @Transactional(noRollbackFor = NegocioException.class)
    public void restablecer(RestablecerContrasenaRequest solicitud) {
        TokenUsuario token = validarCodigo(normalizarCorreo(solicitud.correoElectronico()), solicitud.codigo());
        if (!solicitud.nuevaContrasena().equals(solicitud.confirmacionContrasena())) {
            throw new NegocioException(CodigoError.CONTRASENAS_NO_COINCIDEN);
        }
        Usuario usuario = token.getUsuario();
        usuario.setContrasenaHash(passwordEncoder.encode(solicitud.nuevaContrasena()));
        // Recibir el código demuestra que el correo es suyo (útil para cuentas creadas por un administrador).
        usuario.setCorreoVerificado(true);
        token.setUsado(true);
        tokens.invalidar(usuario.getId(), TipoToken.Refresh);
        limitador.reiniciarLogin(usuario.getCorreoElectronico());
        bitacora.registrar(usuario, BitacoraService.CAMBIO_CONTRASENA, "usuarios", usuario.getId(),
                Map.of("medio", "recuperacion"));
    }

    private TokenUsuario validarCodigo(String correo, String codigo) {
        TokenUsuario token = usuarios.findByCorreoElectronico(correo)
                .flatMap(u -> tokens.findFirstByUsuarioIdAndTipoAndUsadoFalseOrderByIdDesc(u.getId(),
                        TipoToken.Recuperacion_Contrasena))
                .filter(t -> t.getFechaExpiracion().isAfter(OffsetDateTime.now()))
                .orElseThrow(() -> new NegocioException(CodigoError.CODIGO_VENCIDO));
        if (token.getIntentos() >= MAX_INTENTOS_CODIGO) {
            throw new NegocioException(CodigoError.CODIGO_INTENTOS_AGOTADOS);
        }
        if (!passwordEncoder.matches(codigo, token.getTokenHash())) {
            token.setIntentos((short) (token.getIntentos() + 1));
            int restantes = MAX_INTENTOS_CODIGO - token.getIntentos();
            if (restantes == 0) {
                throw new NegocioException(CodigoError.CODIGO_INTENTOS_AGOTADOS);
            }
            throw new NegocioException(CodigoError.CODIGO_INVALIDO, "El código no es correcto. Te quedan "
                    + restantes + (restantes == 1 ? " intento." : " intentos."));
        }
        return token;
    }

    /** El correo es la credencial: se guarda y se compara siempre sin espacios y en minúsculas */
    static String normalizarCorreo(String correo) {
        return correo.trim().toLowerCase(Locale.ROOT);
    }
}
