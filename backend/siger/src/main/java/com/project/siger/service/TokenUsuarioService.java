package com.project.siger.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.model.TokenUsuario;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.TipoToken;
import com.project.siger.repository.TokenUsuarioRepository;

/**
 * Crea los tokens de tokens_usuario. Los refresh tokens y los enlaces de verificación son valores aleatorios de 256 bits
 * guardados como SHA-256 (se buscan por su hash); el código de recuperación de 6 dígitos se guarda con BCrypt
 * en AuthService porque es corto y se compara contra un solo registro.
 */
@Service
public class TokenUsuarioService {

    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final TokenUsuarioRepository tokens;

    public TokenUsuarioService(TokenUsuarioRepository tokens) {
        this.tokens = tokens;
    }

    /** Guarda un token aleatorio nuevo y devuelve su valor en claro, que solo conoce el usuario. */
    @Transactional
    public String crear(Usuario usuario, TipoToken tipo, Duration vigencia, String correoNuevo) {
        byte[] bytes = new byte[32];
        ALEATORIO.nextBytes(bytes);
        String valor = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        TokenUsuario t = new TokenUsuario();
        t.setUsuario(usuario);
        t.setTipo(tipo);
        t.setTokenHash(sha256(valor));
        t.setFechaExpiracion(OffsetDateTime.now().plus(vigencia));
        t.setCorreoNuevo(correoNuevo);
        tokens.save(t);
        return valor;
    }

    public static String sha256(String valor) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static String codigoSeisDigitos() {
        return String.format("%06d", ALEATORIO.nextInt(1_000_000));
    }

    /** Todos los días a las 03:00 borra los tokens que vencieron hace más de un día. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void limpiarVencidos() {
        tokens.borrarVencidosAntesDe(OffsetDateTime.now().minusDays(1));
    }
}
