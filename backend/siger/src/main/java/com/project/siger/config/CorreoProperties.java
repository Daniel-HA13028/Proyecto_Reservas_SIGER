package com.project.siger.config;

import org.springframework.boot.context.properties.ConfigurationProperties;


@ConfigurationProperties("siger.correo")
public record CorreoProperties(String remitente, String frontendUrl) {

    public CorreoProperties {
        remitente = remitente == null || remitente.isBlank() ? "SIGER <no-responder@siger.test>" : remitente;
        frontendUrl = frontendUrl == null || frontendUrl.isBlank() ? "http://localhost:5173"
                : frontendUrl.replaceAll("/+$", "");
    }
}
