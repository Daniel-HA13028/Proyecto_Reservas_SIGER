import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table (name = "bitacora")
@Getter 
@Setter 
@NoArgsConstructor 
public class Bitacora {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bitacora")
    private Long id;

    /** Quién hizo la acción; nulo para acciones del sistema (tareas programadas). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(nullable = false, length = 60)
    private String accion;

    @Column(length = 40)
    private String entidad;

    @Column(name = "id_entidad")
    private Long idEntidad;

    /** Datos adicionales de la acción (columna JSONB). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> detalle;

    @Column(length = 45)
    private String ip;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime fecha;
}
