import org.springframework.boot.web.server.reactive.context.ReactiveWebServerApplicationContext;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table (name ="asistencia")
@NoArgsConstructor 
@Getter 
@Setter 
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
