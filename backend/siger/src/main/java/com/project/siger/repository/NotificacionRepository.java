package com.project.siger.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.model.Notificacion;
import com.project.siger.model.enums.TipoNotificacion;

/** Notificaciones: cola de correos y centro de notificaciones de la campana */
public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    @Transactional
    @Modifying
    @Query("""
            UPDATE Notificacion n SET n.estadoEnvio = com.project.siger.model.enums.EstadoEnvio.Enviado,
                   n.fechaEnvio = :fecha, n.intentosEnvio = n.intentosEnvio + 1
            WHERE n.id = :id""")
    int marcarEnviada(@Param("id") Long id, @Param("fecha") OffsetDateTime fecha);

    @Transactional
    @Modifying
    @Query("""
            UPDATE Notificacion n SET n.estadoEnvio = com.project.siger.model.enums.EstadoEnvio.Fallido,
                   n.intentosEnvio = n.intentosEnvio + 1
            WHERE n.id = :id""")
    int marcarFallida(@Param("id") Long id);

    Page<Notificacion> findByUsuarioId(Long idUsuario, Pageable pagina);

    Page<Notificacion> findByUsuarioIdAndLeida(Long idUsuario, boolean leida, Pageable pagina);

    long countByUsuarioIdAndLeidaFalse(Long idUsuario);

    boolean existsByIdAndUsuarioId(Long id, Long idUsuario);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true WHERE n.id = :id AND n.usuario.id = :idUsuario")
    int marcarLeida(@Param("id") Long id, @Param("idUsuario") Long idUsuario);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true WHERE n.usuario.id = :idUsuario AND n.leida = false")
    int marcarTodasLeidas(@Param("idUsuario") Long idUsuario);

    /** Correos fallidos que todavía se pueden reintentar,s pocos intentos, recientes y de un tipo reconstruible. */
    @EntityGraph(attributePaths = {"usuario", "evento"})
    @Query("""
            SELECT n FROM Notificacion n
            WHERE n.estadoEnvio = com.project.siger.model.enums.EstadoEnvio.Fallido
              AND n.intentosEnvio < :maxIntentos AND n.fechaCreacion > :desde AND n.tipoNotificacion IN :tipos
            ORDER BY n.fechaCreacion""")
    List<Notificacion> paraReintentar(@Param("maxIntentos") short maxIntentos, @Param("desde") OffsetDateTime desde,
            @Param("tipos") Collection<TipoNotificacion> tipos);
}
