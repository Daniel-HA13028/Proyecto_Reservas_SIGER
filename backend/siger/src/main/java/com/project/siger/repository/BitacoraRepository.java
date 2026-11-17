package com.project.siger.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.project.siger.model.Bitacora;

/** Bitácora de acciones, solo se inserta. */
public interface BitacoraRepository extends JpaRepository<Bitacora, Long> {

    /** Último registro de una acción sobre una entidad (por ejemplo, el motivo de un rechazo para reintentar su correo). */
    Optional<Bitacora> findFirstByAccionAndEntidadAndIdEntidadOrderByFechaDesc(String accion, String entidad, Long idEntidad);
}
