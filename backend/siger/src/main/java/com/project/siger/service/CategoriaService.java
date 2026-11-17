package com.project.siger.service;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.dto.response.CategoriaResponse;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;
import com.project.siger.exception.RecursoNoEncontradoException;
import com.project.siger.model.Categoria;
import com.project.siger.repository.CategoriaRepository;

/** Categorías de eventos. No se eliminan: se desactivan */
@Service
public class CategoriaService {

    private final CategoriaRepository categorias;

    public CategoriaService(CategoriaRepository categorias) {
        this.categorias = categorias;
    }

    /** Público: solo activas. Administrador con «todas»: también inactivas y con su número de eventos. */
    @Transactional(readOnly = true)
    public List<CategoriaResponse> listar(boolean todas) {
        if (!todas) {
            return categorias.findByActivaTrueOrderByNombreAsc().stream().map(c -> respuesta(c, null)).toList();
        }
        Map<Short, Long> totales = categorias.contarEventosPorCategoria().stream()
                .collect(java.util.stream.Collectors.toMap(f -> (Short) f[0], f -> (Long) f[1]));
        return categorias.findAll(org.springframework.data.domain.Sort.by("nombre")).stream()
                .map(c -> respuesta(c, totales.getOrDefault(c.getId(), 0L))).toList();
    }

    @Transactional
    public CategoriaResponse crear(String nombre) {
        String limpio = nombre.trim();
        if (categorias.existsByNombreIgnoreCase(limpio)) {
            throw new NegocioException(CodigoError.CATEGORIA_DUPLICADA);
        }
        Categoria c = new Categoria();
        c.setNombre(limpio);
        return respuesta(categorias.saveAndFlush(c), 0L);
    }

    @Transactional
    public CategoriaResponse renombrar(Short id, String nombre) {
        Categoria c = buscar(id);
        String limpio = nombre.trim();
        if (!c.getNombre().equalsIgnoreCase(limpio) && categorias.existsByNombreIgnoreCase(limpio)) {
            throw new NegocioException(CodigoError.CATEGORIA_DUPLICADA);
        }
        c.setNombre(limpio);
        return respuesta(c, null);
    }

    @Transactional
    public CategoriaResponse cambiarEstado(Short id, boolean activa) {
        Categoria c = buscar(id);
        c.setActiva(activa);
        return respuesta(c, null);
    }

    /** Categoría para un evento: debe existir y estar activa (salvo que el evento ya la tuviera). */
    @Transactional(readOnly = true)
    public Categoria paraEvento(Short id, Short actual) {
        Categoria c = buscar(id);
        if (!c.isActiva() && !id.equals(actual)) {
            throw new NegocioException(CodigoError.CATEGORIA_INACTIVA);
        }
        return c;
    }

    /** El contrato recibe el id como Long; las categorías usan SMALLINT. Fuera de rango equivale a no encontrada. */
    public static Short id(Long id) {
        if (id == null || id < 1 || id > Short.MAX_VALUE) {
            throw new RecursoNoEncontradoException("Categoría", id);
        }
        return id.shortValue();
    }

    private Categoria buscar(Short id) {
        return categorias.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Categoría", id));
    }

    private static CategoriaResponse respuesta(Categoria c, Long totalEventos) {
        return new CategoriaResponse(c.getId(), c.getNombre(), c.isActiva(), c.getFechaCreacion(), totalEventos);
    }
}
