package com.project.siger.repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import com.project.siger.model.Evento;

/** Eventos. JpaSpecificationExecutor permite los filtros combinables del catálogo (spec/). */
public interface EventoRepository extends JpaRepository<Evento, Long>, JpaSpecificationExecutor<Evento> {

    /** Listados: trae la categoría en la misma consulta (evita una consulta por tarjeta). */
    @Override
    @EntityGraph(attributePaths = "categoria")
    @NonNull
    Page<Evento> findAll(@Nullable     Specification<Evento> spec, Pageable pageable);

    /** Detalle: con categoría y organizador. */
    @EntityGraph(attributePaths = {"categoria", "organizador"})
    Optional<Evento> findConDetalleById(Long id);

        /** Devuelve true si el evento tiene cupos disponibles y está Publicado y vigente. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE Evento e SET e.cupoDisponible = e.cupoDisponible - :cantidad
            WHERE e.id = :idEvento AND e.cupoDisponible >= :cantidad
              AND e.estadoEvento = com.project.siger.model.enums.EstadoEvento.Publicado
              AND e.fechaLimiteReserva > CURRENT_TIMESTAMP""")
    int descontarCupos(@Param("idEvento") Long idEvento, @Param("cantidad") int cantidad);

    /** Devuelve cupos al cancelar una reservación, sin superar el cupo máximo. Devuelve 1 si se aplicó. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE Evento e SET e.cupoDisponible = e.cupoDisponible + :cantidad
            WHERE e.id = :idEvento AND e.cupoDisponible + :cantidad <= e.cupoMaximo""")
    int devolverCupos(@Param("idEvento") Long idEvento, @Param("cantidad") int cantidad);

    /** los eventos Publicados cuyo fin ya pasó quedan Finalizados. Devuelve cuántos cambiaron. */
    @Modifying
    @Query("""
            UPDATE Evento e SET e.estadoEvento = com.project.siger.model.enums.EstadoEvento.Finalizado,
                   e.fechaActualizacion = :ahora
            WHERE e.estadoEvento = com.project.siger.model.enums.EstadoEvento.Publicado AND e.fechaHoraFin <= :ahora""")
    int finalizarVencidos(@Param("ahora") OffsetDateTime ahora);
}
