package com.project.siger.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import com.project.siger.model.enums.EstadoEnvio;
import com.project.siger.model.enums.TipoNotificacion;

@Entity
@Table(name = "notificaciones")
@Getter
@Setter
@NoArgsConstructor
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_notificacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    /** Evento relacionado, si lo hay (por ejemplo, cancelación de un evento). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_evento")
    private Evento evento;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_notificacion", nullable = false, length = 40)
    private TipoNotificacion tipoNotificacion;

    @Column(nullable = false, length = 150)
    private String asunto;

    @Column(name = "mensaje_contenido", nullable = false, columnDefinition = "text")
    private String mensajeContenido;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_envio", nullable = false, length = 15)
    private EstadoEnvio estadoEnvio = EstadoEnvio.Pendiente;

    @Column(name = "intentos_envio", nullable = false)
    private Short intentosEnvio = 0;

    @Column(nullable = false)
    private boolean leida;

    @CreationTimestamp
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_envio")
    private OffsetDateTime fechaEnvio;
}
