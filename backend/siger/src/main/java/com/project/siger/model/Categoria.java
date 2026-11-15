import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table(name = "categorias")
@Getter
@Setter 
@NoArgsConstructor 
public class Categoria {

     @Id 
    @GeneratedValue (strategy = GenerationType.IDENTITY)
    @Column (name = "id_categoria")
    private Short id;

    @Column (nullable = false, length = 60, unique = true)
    private String nombre;

    /** Una categoría inactiva no se ofrece al crear eventos, pero los existentes la conservan. */
    @Column(nullable = false)
    private boolean activa = true;

    @CreationTimestamp 
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;
}
}
