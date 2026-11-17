package com.project.siger.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import com.project.siger.model.Categoria;

/** Categorías de eventos */
public interface CategoriaRepository extends JpaRepository<Categoria, Short> {

    /** Las que se ofrecen al crear o filtrar eventos. */
    List<Categoria> findByActivaTrueOrderByNombreAsc();

    boolean existsByNombreIgnoreCase(String nombre);

    /** [idCategoria, número de eventos] de las categorías que tienen eventos (vista del administrador). */
    @Query("SELECT e.categoria.id, count(e) FROM Evento e GROUP BY e.categoria.id")
    List<Object[]> contarEventosPorCategoria();
}
