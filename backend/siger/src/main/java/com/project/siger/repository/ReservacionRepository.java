package com.project.siger.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import com.project.siger.model.Reservacion;
import com.project.siger.model.enums.EstadoReservacion;

/** Reservaciones. */
public interface ReservacionRepository extends JpaRepository<Reservacion, Long>, JpaSpecificationExecutor<Reservacion> {

    /** Busca la reservación del código QR o digital */
    @EntityGraph(attributePaths = {"evento", "participante"})
    Optional<Reservacion> findByCodigoComprobante(String codigoComprobante);

    /** un participante no puede tener dos reservaciones confirmadas para el mismo evento. */
    boolean existsByEventoIdAndParticipanteIdAndEstadoReservacion(Long idEvento, Long idParticipante,
            EstadoReservacion estadoReservacion);

    /** Reservaciones de un evento en un estado, con su participante (cancelación y notificaciones). */
    @EntityGraph(attributePaths = "participante")
    List<Reservacion> findByEventoIdAndEstadoReservacion(Long idEvento, EstadoReservacion estadoReservacion);

    boolean existsByEventoId(Long idEvento);

    long countByEventoIdAndEstadoReservacion(Long idEvento, EstadoReservacion estadoReservacion);

    /** Búsquedas paginadas (mis reservaciones, participantes de un evento) con el evento y el participante en la misma consulta. */
    @Override
    @EntityGraph(attributePaths = {"evento", "participante"})
@NonNull
    Page<Reservacion> findAll(@Nullable     Specification<Reservacion> filtro, Pageable pagina);

    /** Lista completa para exportar  */
    @Override
    @EntityGraph(attributePaths = "participante")
@NonNull
    List<Reservacion> findAll(@Nullable     Specification<Reservacion> filtro, org.springframework.data.domain.Sort orden);

    /** Acompañantes de las reservaciones en un estado; con el conteo da las personas esperadas */
    @Query("select coalesce(sum(r.cantidadAcompanantes), 0) from Reservacion r where r.evento.id = :idEvento and r.estadoReservacion = :estado")
    Number sumarAcompanantes(@Param("idEvento") Long idEvento, @Param("estado") EstadoReservacion estado);

    /** Reservación vigente de un participante en un evento (reintentos de correo) */
    @EntityGraph(attributePaths = {"evento", "participante"})
    Optional<Reservacion> findFirstByEventoIdAndParticipanteIdAndEstadoReservacion(Long idEvento, Long idParticipante,
            EstadoReservacion estadoReservacion);

    /**
     * Candidatas a recordatorio: confirmadas de eventos publicados que empiezan entre «desde» y «hasta» y
     * cuyo participante todavía no recibió el recordatorio de ese evento.
     */
    @EntityGraph(attributePaths = {"evento", "participante"})
    @Query("""
            SELECT r FROM Reservacion r JOIN r.evento e
            WHERE r.estadoReservacion = com.project.siger.model.enums.EstadoReservacion.Confirmada
              AND e.estadoEvento = com.project.siger.model.enums.EstadoEvento.Publicado
              AND e.fechaHoraInicio > :desde AND e.fechaHoraInicio <= :hasta
              AND NOT EXISTS (SELECT 1 FROM Notificacion n WHERE n.usuario = r.participante AND n.evento = e
                              AND n.tipoNotificacion = com.project.siger.model.enums.TipoNotificacion.Recordatorio)""")
    List<Reservacion> paraRecordatorio(@Param("desde") java.time.OffsetDateTime desde, @Param("hasta") java.time.OffsetDateTime hasta);
}
