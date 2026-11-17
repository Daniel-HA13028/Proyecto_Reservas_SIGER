package com.project.siger.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;


@ConfigurationProperties("siger.jwt")
public record JwtProperties(String secreto, Duration acceso, Duration refresh, Duration refreshRecordarme,
        Duration graciaReutilizacion) {

    public JwtProperties {
        acceso = acceso == null ? Duration.ofMinutes(30) : acceso;
        refresh = refresh == null ? Duration.ofDays(1) : refresh;
        refreshRecordarme = refreshRecordarme == null ? Duration.ofDays(30) : refreshRecordarme;
        // Un refresh token recién rotado que vuelve a llegar en este plazo se trata como reintento (respuesta perdida,
        // recarga de la página) y no como robo.
        graciaReutilizacion = graciaReutilizacion == null ? Duration.ofSeconds(30) : graciaReutilizacion;
    }
}
