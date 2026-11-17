package com.project.siger.repository.spec;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Locale;
import org.hibernate.query.criteria.HibernateCriteriaBuilder;
import org.springframework.data.jpa.domain.Specification;
import com.project.siger.dto.OrdenCatalogo;
import com.project.siger.model.Evento;
import com.project.siger.model.Reservacion;
import com.project.siger.model.enums.EstadoEvento;
import com.project.siger.model.enums.EstadoReservacion;

/**
 * La búsqueda usa ILIKE, que aprovecha el índice de trigramas
 * ix_eventos_busqueda_trgm (V2) para responder en menos de 2 s.
 */
public final class EventoSpecifications {

    /** Las fechas «desde» y «hasta» del catálogo se interpretan en la hora de El Salvador. */
    public static final ZoneId ZONA = ZoneId.of("America/El_Salvador");

    private EventoSpecifications() {
    }

    public static Specification<Evento> catalogo(String buscar, Short categoria, LocalDate desde, LocalDate hasta,
            String ubicacion, OrdenCatalogo orden) {
        Specification<Evento> base = (raiz, consulta, cb) -> cb.and(
                cb.equal(raiz.get("estadoEvento"), EstadoEvento.Publicado),
                cb.greaterThan(raiz.get("fechaHoraInicio"), OffsetDateTime.now()));
        return base.and(texto(buscar)).and(categoria(categoria)).and(desde(desde)).and(hasta(hasta))
                .and(ubicacion(ubicacion)).and(ordenar(orden));
    }

    /** Eventos de un organizador (o todos, para el administrador) con un estado opcional. */
    public static Specification<Evento> deOrganizador(Long idOrganizador, EstadoEvento estado) {
        Specification<Evento> base = (raiz, consulta, cb) -> cb.conjunction();
        if (idOrganizador != null) {
            base = base.and((raiz, consulta, cb) -> cb.equal(raiz.get("organizador").get("id"), idOrganizador));
        }
        if (estado != null) {
            base = base.and((raiz, consulta, cb) -> cb.equal(raiz.get("estadoEvento"), estado));
        }
        return base;
    }

    static Specification<Evento> texto(String buscar) {
        if (buscar == null || buscar.isBlank()) {
            return null;
        }
        String patron = patron(buscar);
        return (raiz, consulta, cb) -> {
            HibernateCriteriaBuilder h = (HibernateCriteriaBuilder) cb;
            return cb.or(h.ilike(raiz.get("nombreEvento"), patron, '\\'), h.ilike(raiz.get("ubicacion"), patron, '\\'));
        };
    }

    static Specification<Evento> ubicacion(String ubicacion) {
        if (ubicacion == null || ubicacion.isBlank()) {
            return null;
        }
        String patron = patron(ubicacion);
        return (raiz, consulta, cb) -> ((HibernateCriteriaBuilder) cb).ilike(raiz.get("ubicacion"), patron, '\\');
    }

    static Specification<Evento> categoria(Short id) {
        return id == null ? null : (raiz, consulta, cb) -> cb.equal(raiz.get("categoria").get("id"), id);
    }

    static Specification<Evento> desde(LocalDate fecha) {
        return fecha == null ? null : (raiz, consulta, cb) -> cb.greaterThanOrEqualTo(raiz.get("fechaHoraInicio"),
                fecha.atStartOfDay(ZONA).toOffsetDateTime());
    }

    static Specification<Evento> hasta(LocalDate fecha) {
        return fecha == null ? null : (raiz, consulta, cb) -> cb.lessThan(raiz.get("fechaHoraInicio"),
                fecha.plusDays(1).atStartOfDay(ZONA).toOffsetDateTime());
    }

    /**
     * Orden: por fecha de inicio, o por popularidad (reservaciones confirmadas, de mayor a menor). Se aplica aquí y no
     * en el Pageable porque la popularidad es una subconsulta; en la consulta de conteo no se ordena.
     */
    static Specification<Evento> ordenar(OrdenCatalogo orden) {
        return (raiz, consulta, cb) -> {
            if (Long.class.equals(consulta.getResultType()) || long.class.equals(consulta.getResultType())) {
                return null;
            }
            if (orden == OrdenCatalogo.popularidad) {
                Subquery<Long> reservas = consulta.subquery(Long.class);
                var r = reservas.from(Reservacion.class);
                reservas.select(cb.count(r)).where(cb.equal(r.get("evento"), raiz),
                        cb.equal(r.get("estadoReservacion"), EstadoReservacion.Confirmada));
                Expression<Long> total = reservas;
                consulta.orderBy(cb.desc(total), cb.asc(raiz.get("fechaHoraInicio")), cb.asc(raiz.get("id")));
            } else {
                consulta.orderBy(cb.asc(raiz.get("fechaHoraInicio")), cb.asc(raiz.get("id")));
            }
            return null;
        };
    }

    private static String patron(String texto) {
        return "%" + texto.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
