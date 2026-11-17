package com.project.siger.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;
import com.project.siger.model.Usuario;


@Component
@EnableConfigurationProperties(JwtProperties.class)
public class JwtService {

    private static final String EMISOR = "siger";

    private final SecretKey clave;
    private final JwtProperties propiedades;

    public JwtService(JwtProperties propiedades) {
        if (propiedades.secreto() == null || propiedades.secreto().isBlank()) {
            throw new IllegalStateException("Falta siger.jwt.secreto (SIGER_JWT_SECRETO): clave Base64 de al menos 32 bytes.");
        }
        byte[] bytes = Decoders.BASE64.decode(propiedades.secreto());
        if (bytes.length < 32) {
            throw new IllegalStateException("siger.jwt.secreto debe tener al menos 32 bytes (256 bits) en Base64.");
        }
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.propiedades = propiedades;
    }

    public String generarAcceso(Usuario usuario) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .issuer(EMISOR)
                .subject(String.valueOf(usuario.getId()))
                .claim("rol", usuario.getRol().name())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(propiedades.acceso())))
                .signWith(clave)
                .compact();
    }

    public long segundosDeAcceso() {
        return propiedades.acceso().toSeconds();
    }

    /** Devuelve el id del usuario del token o lanza TokenInvalidoException indicando si venció. */
    public Long validar(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(clave).requireIssuer(EMISOR).build()
                    .parseSignedClaims(token).getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (ExpiredJwtException e) {
            throw new TokenInvalidoException(true);
        } catch (JwtException | IllegalArgumentException e) {
            throw new TokenInvalidoException(false);
        }
    }

    /** Token ausente de firma válida, mal formado o vencido. */
    public static class TokenInvalidoException extends RuntimeException {
        private final boolean vencido;

        public TokenInvalidoException(boolean vencido) {
            super(vencido ? "Token vencido" : "Token no válido");
            this.vencido = vencido;
        }

        public boolean isVencido() {
            return vencido;
        }
    }
}
