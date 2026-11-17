package com.project.siger.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import com.project.siger.service.UsuarioDetailsServiceImpl;


@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties({CorsProperties.class, CorreoProperties.class})
public class SecurityConfig {

    /** Rutas públicas del contrato (T-01-02): las marcadas «Público», más la renovación de tokens. */
    private static final String[] AUTH_PUBLICAS = {
            "/api/v1/auth/registro", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/verificar-correo",
            "/api/v1/auth/reenviar-verificacion", "/api/v1/auth/recuperar", "/api/v1/auth/verificar-codigo",
            "/api/v1/auth/restablecer"};

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ErroresSeguridadHandler errores,
            JwtAuthenticationFilter jwtFilter) throws Exception {
        return http
                // Sin cookies de sesión: el token viaja en Authorization, así que CSRF no aplica.
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(e -> e.authenticationEntryPoint(errores).accessDeniedHandler(errores))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, AUTH_PUBLICAS).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/eventos", "/api/v1/eventos/*", "/api/v1/categorias").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/soporte/tickets").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/error").permitAll()
                        // Defensa adicional a @PreAuthorize: toda la gestión de usuarios es del Administrador (RN-05).
                        .requestMatchers("/api/v1/usuarios/**").hasRole("ADMINISTRADOR")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /** El filtro JWT solo debe correr dentro de Spring Security, no también como filtro suelto del servidor. */
    @Bean
    FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistro(JwtAuthenticationFilter filtro) {
        FilterRegistrationBean<JwtAuthenticationFilter> registro = new FilterRegistrationBean<>(filtro);
        registro.setEnabled(false);
        return registro;
    }

    /** Comprueba correo y contraseña al iniciar sesión (AuthService); BCrypt con costo 10 */
    @Bean
    AuthenticationManager authenticationManager(UsuarioDetailsServiceImpl usuarios, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider proveedor = new DaoAuthenticationProvider(usuarios);
        proveedor.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(proveedor);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(CorsProperties cors) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(cors.origenes());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE, HttpHeaders.ACCEPT));
        // Nombre del archivo en las descargas de reportes y comprobantes.
        config.setExposedHeaders(List.of(HttpHeaders.CONTENT_DISPOSITION));
        config.setAllowCredentials(false);
        config.setMaxAge(Duration.ofHours(1));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
