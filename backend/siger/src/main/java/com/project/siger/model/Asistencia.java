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
import com.project.siger.model.enums.MetodoValidacion;


@Entity
@Table(name = "asistencias")
@Getter
@Setter
@NoArgsConstructor
public class Asistencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_asistencia")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_reservacion", nullable = false)
    private Reservacion reservacion;

    @CreationTimestamp
    @Column(name = "fecha_hora_validacion", nullable = false, updatable = false)
    private OffsetDateTime fechaHoraValidacion;

    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_validacion", nullable = false, length = 30)
    private MetodoValidacion metodoValidacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_registrado_por", nullable = false)
    private Usuario registradoPor;

    @Column(nullable = false)
    private boolean anulada;

    @Column(name = "fecha_anulacion")
    private OffsetDateTime fechaAnulacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_anulada_por")
    private Usuario anuladaPor;

    /** Marca la asistencia como anulada con su fecha y responsable, como exige ck_asistencias_anulacion. */
    public void anular(Usuario responsable, OffsetDateTime fecha) {
        this.anulada = true;
        this.fechaAnulacion = fecha;
        this.anuladaPor = responsable;
    }
}

