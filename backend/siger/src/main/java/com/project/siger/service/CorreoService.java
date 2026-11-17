package com.project.siger.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import com.project.siger.config.CorreoProperties;
import com.project.siger.repository.NotificacionRepository;

/**
 * Envía los correos con JavaMailSender y plantillas Thymeleaf de templates/correo. Corre en segundo plano
 * para no demorar la respuesta; el resultado queda en notificaciones.estado_envio (Enviado o Fallido). 
 */
@Service
public class CorreoService {

    private static final Logger log = LoggerFactory.getLogger(CorreoService.class);

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine plantillas;
    private final CorreoProperties propiedades;
    private final NotificacionRepository notificaciones;

    public CorreoService(JavaMailSender mailSender, SpringTemplateEngine plantillas, CorreoProperties propiedades,
            NotificacionRepository notificaciones) {
        this.mailSender = mailSender;
        this.plantillas = plantillas;
        this.propiedades = propiedades;
        this.notificaciones = notificaciones;
    }

    /** Imagen incrustada en el correo; la plantilla la muestra con src="cid:{cid}" (por ejemplo, el QR del comprobante). */
    public record Adjunto(String cid, byte[] contenido, String tipo) {
    }

    @Async("correoExecutor")
    public void enviar(Long idNotificacion, String destino, String asunto, String plantilla, Map<String, Object> modelo,
            java.util.List<Adjunto> adjuntos) {
        try {
            Context contexto = new Context(java.util.Locale.forLanguageTag("es"));
            contexto.setVariables(modelo);
            contexto.setVariable("frontendUrl", propiedades.frontendUrl());
            contexto.setVariable("asunto", asunto);
            String html = plantillas.process("correo/" + plantilla, contexto);

            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper ayudante = new MimeMessageHelper(mensaje, !adjuntos.isEmpty(), StandardCharsets.UTF_8.name());
            ayudante.setFrom(propiedades.remitente());
            ayudante.setTo(destino);
            ayudante.setSubject("SIGER · " + asunto);
            ayudante.setText(html, true);
            for (Adjunto a : adjuntos) {
                ayudante.addInline(a.cid(), new org.springframework.core.io.ByteArrayResource(a.contenido()), a.tipo());
            }
            mailSender.send(mensaje);
            notificaciones.marcarEnviada(idNotificacion, OffsetDateTime.now());
        } catch (MessagingException | RuntimeException e) {
            log.warn("No se pudo enviar la notificación {} a {}: {}", idNotificacion, destino, e.getMessage());
            notificaciones.marcarFallida(idNotificacion);
        }
    }
}
