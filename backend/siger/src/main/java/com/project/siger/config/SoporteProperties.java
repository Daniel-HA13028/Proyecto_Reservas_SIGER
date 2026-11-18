package com.project.siger.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Buzón del equipo de soporte (siger.soporte.correo, variable SIGER_SOPORTE_CORREO), por ejemplo una cuenta de Gmail.
 * Cada solicitud nueva se reenvía ahí con «Responder a» apuntando al correo de quien la reportó. Sin valor, las
 * solicitudes solo se ven en la pantalla de soporte del administrador.
 */
@ConfigurationProperties("siger.soporte")
public record SoporteProperties(String correo) {

    public SoporteProperties {
        correo = correo == null || correo.isBlank() ? null : correo.trim();
    }
}
