package com.project.siger.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Límites de intentos con Bucket4j, en memoria:
 * - Inicio de sesión: 5 intentos fallidos por correo en 15 minutos; luego 429 INTENTOS_EXCEDIDOS
 * - Recuperación y reenvío de verificación: 3 solicitudes por correo y 10 por IP cada 15 minutos 
 * Con una sola instancia del backend basta la memoria; con varias habría que llevar los buckets a la base o a Redis.
 * Los límites se pueden ajustar con siger.limites.* (las pruebas suben el de IP porque todas salen de 127.0.0.1).
 */
@Component
public class LimitadorSolicitudes {

    static final Duration VENTANA = Duration.ofMinutes(15);

    private final int fallosLoginMaximos;
    private final int solicitudesPorCorreo;
    private final int solicitudesPorIp;

    private final Map<String, Bucket> fallosLogin = new ConcurrentHashMap<>();
    private final Map<String, Bucket> solicitudes = new ConcurrentHashMap<>();

    public LimitadorSolicitudes(@Value("${siger.limites.login-fallos:5}") int fallosLoginMaximos,
            @Value("${siger.limites.solicitudes-por-correo:3}") int solicitudesPorCorreo,
            @Value("${siger.limites.solicitudes-por-ip:10}") int solicitudesPorIp) {
        this.fallosLoginMaximos = fallosLoginMaximos;
        this.solicitudesPorCorreo = solicitudesPorCorreo;
        this.solicitudesPorIp = solicitudesPorIp;
    }

    /** true si el correo ya agotó sus intentos fallidos. */
    public boolean loginBloqueado(String correo) {
        Bucket b = fallosLogin.get(correo);
        return b != null && b.getAvailableTokens() == 0;
    }

    public void registrarFalloLogin(String correo) {
        fallosLogin.computeIfAbsent(correo, c -> nuevo(fallosLoginMaximos)).tryConsume(1);
    }

    public void reiniciarLogin(String correo) {
        fallosLogin.remove(correo);
    }

    /** Consume una solicitud del correo y otra de la IP; false si alguno superó su límite. */
    public boolean permitirSolicitud(String operacion, String correo, String ip) {
        Bucket porCorreo = solicitudes.computeIfAbsent(operacion + ":correo:" + correo, k -> nuevo(solicitudesPorCorreo));
        Bucket porIp = solicitudes.computeIfAbsent(operacion + ":ip:" + ip, k -> nuevo(solicitudesPorIp));
        boolean ipPermitida = porIp.tryConsume(1);
        boolean correoPermitido = porCorreo.tryConsume(1);
        return ipPermitida && correoPermitido;
    }

    /** Borra los buckets que ya se recuperaron por completo para que la memoria no crezca sin límite. */
    @Scheduled(fixedDelay = 30, timeUnit = TimeUnit.MINUTES)
    public void limpiar() {
        fallosLogin.values().removeIf(b -> b.getAvailableTokens() >= fallosLoginMaximos);
        solicitudes.entrySet().removeIf(e -> e.getValue().getAvailableTokens()
                >= (e.getKey().contains(":ip:") ? solicitudesPorIp : solicitudesPorCorreo));
    }

    private static Bucket nuevo(int capacidad) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(capacidad).refillIntervally(capacidad, VENTANA).build())
                .build();
    }
}
