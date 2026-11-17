package com.project.siger.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.project.siger.model.Asistencia;

/** Asistencias. Las anuladas se conservan, solo cuenta la vigente. */
public interface AsistenciaRepository extends JpaRepository<Asistencia, Long> {

    boolean existsByReservacionIdAndAnuladaFalse(Long idReservacion);

    Optional<Asistencia> findByReservacionIdAndAnuladaFalse(Long idReservacion);

    /** Nombre usado en el diagrama de secuencia D  */
    default boolean existsVigente(Long idReservacion) {
        return existsByReservacionIdAndAnuladaFalse(idReservacion);
    }

    /** De las reservaciones dadas, las que tienen asistencia vigente (una sola consulta por página) */
    @Query("select a.reservacion.id from Asistencia a where a.anulada = false and a.reservacion.id in :ids")
    Set<Long> reservacionesConAsistencia(@Param("ids") Collection<Long> ids);

    /** Asistencias vigentes de las reservaciones de una página de participantes */
    List<Asistencia> findByReservacionIdInAndAnuladaFalse(Collection<Long> idsReservacion);

    /** Asistencias vigentes de un evento, de la más reciente a la más antigua, para las estadísticas en vivo */
    @EntityGraph(attributePaths = {"reservacion", "reservacion.participante", "registradoPor"})
    List<Asistencia> findByReservacionEventoIdAndAnuladaFalseOrderByFechaHoraValidacionDesc(Long idEvento);
}
