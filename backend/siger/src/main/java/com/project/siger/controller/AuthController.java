package com.project.siger.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.extensions.Extension;
import io.swagger.v3.oas.annotations.extensions.ExtensionProperty;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.dto.request.CorreoRequest;
import com.project.siger.dto.request.LoginRequest;
import com.project.siger.dto.request.RefreshTokenRequest;
import com.project.siger.dto.request.RegistroRequest;
import com.project.siger.dto.request.RestablecerContrasenaRequest;
import com.project.siger.dto.request.VerificarCodigoRequest;
import com.project.siger.dto.request.VerificarCorreoRequest;
import com.project.siger.dto.response.AuthResponse;
import com.project.siger.dto.response.UsuarioResponse;
import com.project.siger.service.AuthService;

/**
 * Registro, inicio de sesión, verificación de correo y recuperación de contraseña.
 */
@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Autenticación", description = "Registro, inicio de sesión, verificación de correo y recuperación de contraseña.")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registro")
    @Operation(summary = "Registrar cuenta",
            description = "Público. Envía el correo de verificación. Un Organizador queda Pendiente. 409 si el correo ya existe.",
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "409", value = "Conflicto")}))
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<UsuarioResponse> registrar(
            @Valid @RequestBody RegistroRequest solicitud
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registrar(solicitud));
    }

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión",
            description = "Público. 401 con mensaje genérico ante credenciales incorrectas; 403 con mensaje específico si la cuenta está Pendiente o Inactiva; 429 tras 5 intentos fallidos (bloqueo de 15 min).",
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "429", value = "DemasiadasSolicitudes")}))
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest solicitud
    ) {
        return ResponseEntity.ok(authService.login(solicitud));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar tokens",
            description = "Entrega un access token nuevo y rota el refresh token.")
    public ResponseEntity<AuthResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest solicitud
    ) {
        return ResponseEntity.ok(authService.refrescar(solicitud.refreshToken()));
    }

    @PostMapping("/logout")
    @Operation(summary = "Cerrar sesión",
            description = "Autenticado. Invalida el refresh token.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> logout(
            @Parameter(hidden = true) @AuthenticationPrincipal UsuarioAutenticado yo,
            @Valid @RequestBody RefreshTokenRequest solicitud
    ) {
        authService.logout(yo.id(), solicitud.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/verificar-correo")
    @Operation(summary = "Verificar correo",
            description = "Público. Confirma el correo de registro o el nuevo correo del perfil.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> verificarCorreo(
            @Valid @RequestBody VerificarCorreoRequest solicitud
    ) {
        authService.verificarCorreo(solicitud.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reenviar-verificacion")
    @Operation(summary = "Reenviar verificación",
            description = "Público. Responde igual exista o no el correo.",
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "429", value = "DemasiadasSolicitudes")}))
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ResponseEntity<Void> reenviarVerificacion(
            @Valid @RequestBody CorreoRequest solicitud,
            HttpServletRequest request
    ) {
        authService.reenviarVerificacion(solicitud.correoElectronico(), request.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/recuperar")
    @Operation(summary = "Recuperar contraseña: paso 1",
            description = "Público. Envía un código de 6 dígitos válido por 15 minutos. Responde igual exista o no el correo.",
            extensions = @Extension(name = "x-errores", properties = {@ExtensionProperty(name = "429", value = "DemasiadasSolicitudes")}))
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ResponseEntity<Void> recuperar(
            @Valid @RequestBody CorreoRequest solicitud,
            HttpServletRequest request
    ) {
        authService.recuperar(solicitud.correoElectronico(), request.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/verificar-codigo")
    @Operation(summary = "Recuperar contraseña: paso 2",
            description = "Público. Comprueba el código sin consumirlo; al quinto intento fallido se invalida.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> verificarCodigo(
            @Valid @RequestBody VerificarCodigoRequest solicitud
    ) {
        authService.verificarCodigo(solicitud.correoElectronico(), solicitud.codigo());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/restablecer")
    @Operation(summary = "Recuperar contraseña: paso 3",
            description = "Público. Guarda la nueva contraseña y marca el código como usado.")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> restablecer(
            @Valid @RequestBody RestablecerContrasenaRequest solicitud
    ) {
        authService.restablecer(solicitud);
        return ResponseEntity.noContent().build();
    }
}
