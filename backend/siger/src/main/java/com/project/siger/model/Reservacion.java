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
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import platform.siger.model.enums.EstadoReservacion;


@Entity
@Table(name = "reservaciones")
@Getter
@Setter
@NoArgsConstructor
public class Reservacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reservacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_evento", nullable = false)
    private Evento evento;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_participante", nullable = false)
    private Usuario participante;

    @Column(name = "cantidad_acompanantes", nullable = false)
    private Short cantidadAcompanantes = 0;

    @Column(length = 300)
    private String observaciones;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monto = BigDecimal.ZERO;

    /** Contenido del código QR y del código digital; único y no adivinable. */
    @Column(name = "codigo_comprobante", nullable = false, length = 64, unique = true)
    private String codigoComprobante;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_reservacion", nullable = false, length = 20)
    private EstadoReservacion estadoReservacion = EstadoReservacion.Confirmada;

    @CreationTimestamp
    @Column(name = "fecha_reservacion", nullable = false, updatable = false)
    private OffsetDateTime fechaReservacion;

    /** Obligatoria cuando la reservación se cancela (ck_reservaciones_fecha_cancelacion). */
    @Column(name = "fecha_cancelacion")
    private OffsetDateTime fechaCancelacion;
}

