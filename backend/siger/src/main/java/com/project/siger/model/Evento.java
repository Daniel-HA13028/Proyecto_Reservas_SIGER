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
import org.hibernate.annotations.UpdateTimestamp;
import platform.siger.model.enums.EstadoEvento;

@Entity
@Table(name = "eventos")
@Getter
@Setter
@NoArgsConstructor
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_evento")
    private Long id;

    @Column(name = "nombre_evento", nullable = false, length = 150)
    private String nombreEvento;

    @Column(nullable = false, columnDefinition = "text")
    private String descripcion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_categoria", nullable = false)
    private Categoria categoria;

    @Column(name = "fecha_hora_inicio", nullable = false)
    private OffsetDateTime fechaHoraInicio;

    @Column(name = "fecha_hora_fin", nullable = false)
    private OffsetDateTime fechaHoraFin;

    @Column(name = "fecha_limite_reserva", nullable = false)
    private OffsetDateTime fechaLimiteReserva;

    @Column(nullable = false, length = 200)
    private String ubicacion;

    @Column(name = "cupo_maximo", nullable = false)
    private Integer cupoMaximo;

    @Column(name = "cupo_disponible", nullable = false)
    private Integer cupoDisponible;

    @Column(name = "max_acompanantes", nullable = false)
    private Short maxAcompanantes = 0;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precio = BigDecimal.ZERO;

    @Column(name = "imagen_url", length = 300)
    private String imagenUrl;

    @Column(name = "requiere_qr", nullable = false)
    private boolean requiereQr = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_evento", nullable = false, length = 20)
    private EstadoEvento estadoEvento = EstadoEvento.Borrador;

    @Column(nullable = false)
    private boolean reprogramado;

    /** Obligatorio cuando el evento se cancela (ck_eventos_motivo_cancelacion). */
    @Column(name = "motivo_cancelacion", length = 300)
    private String motivoCancelacion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_organizador", nullable = false)
    private Usuario organizador;

    @CreationTimestamp
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion;
}
