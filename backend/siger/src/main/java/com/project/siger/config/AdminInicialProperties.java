package com.project.siger.config;

import org.springframework.boot.context.properties.ConfigurationProperties;


@ConfigurationProperties("siger.admin")
public record AdminInicialProperties(String correo, String contrasena, String nombres, String apellidos) {

    public AdminInicialProperties {
        nombres = nombres == null || nombres.isBlank() ? "Administrador" : nombres.trim();
        apellidos = apellidos == null || apellidos.isBlank() ? "SIGER" : apellidos.trim();
    }
}
