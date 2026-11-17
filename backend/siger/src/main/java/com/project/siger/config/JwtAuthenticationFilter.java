package com.project.siger.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.project.siger.exception.CodigoError;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.service.UsuarioDetailsServiceImpl;


@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIJO = "Bearer ";

    private final JwtService jwtService;
    private final UsuarioDetailsServiceImpl usuarios;
    private final ErroresSeguridadHandler errores;

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioDetailsServiceImpl usuarios, ErroresSeguridadHandler errores) {
        this.jwtService = jwtService;
        this.usuarios = usuarios;
        this.errores = errores;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String ruta = request.getServletPath();
        return ruta.startsWith("/api/v1/auth/") && !ruta.equals("/api/v1/auth/logout");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain cadena)
            throws ServletException, IOException {
        String encabezado = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (encabezado == null || !encabezado.startsWith(PREFIJO)) {
            cadena.doFilter(request, response);
            return;
        }
        Long idUsuario;
        try {
            idUsuario = jwtService.validar(encabezado.substring(PREFIJO.length()).trim());
        } catch (JwtService.TokenInvalidoException e) {
            errores.escribir(response, e.isVencido() ? CodigoError.SESION_EXPIRADA : CodigoError.SESION_NO_VALIDA);
            return;
        }
        // Se consulta la cuenta en cada petición: si un administrador la desactiva, el token deja de servir al instante.
        Optional<UsuarioAutenticado> usuario = usuarios.cargarPorId(idUsuario);
        if (usuario.isEmpty() || usuario.get().estado() != EstadoCuenta.Activo) {
            errores.escribir(response, CodigoError.SESION_NO_VALIDA);
            return;
        }
        var autenticacion = new UsernamePasswordAuthenticationToken(usuario.get(), null, usuario.get().getAuthorities());
        autenticacion.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(autenticacion);
        cadena.doFilter(request, response);
    }
}
