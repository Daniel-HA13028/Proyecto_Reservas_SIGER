package com.project.siger.repository.spec;

import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.model.enums.Rol;

/** Filtros combinables de la Gestión de Usuarios: texto, rol y estado. Un filtro nulo no se aplica. */
public final class UsuarioSpecifications {

    private UsuarioSpecifications() {
    }

    public static Specification<Usuario> filtrar(String buscar, Rol rol, EstadoCuenta estado) {
        Specification<Usuario> todos = (raiz, consulta, cb) -> cb.conjunction();
        return todos.and(texto(buscar)).and(conRol(rol)).and(conEstado(estado));
    }

    /** Busca en nombres, apellidos, nombre completo y correo, sin distinguir mayúsculas. */
    static Specification<Usuario> texto(String buscar) {
        if (buscar == null || buscar.isBlank()) {
            return null;
        }
        String patron = "%" + buscar.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%")
                .replace("_", "\\_") + "%";
        return (raiz, consulta, cb) -> cb.or(
                cb.like(cb.lower(raiz.get("nombres")), patron, '\\'),
                cb.like(cb.lower(raiz.get("apellidos")), patron, '\\'),
                cb.like(cb.lower(cb.concat(cb.concat(raiz.get("nombres"), " "), raiz.get("apellidos"))), patron, '\\'),
                cb.like(raiz.get("correoElectronico"), patron, '\\'));
    }

    static Specification<Usuario> conRol(Rol rol) {
        return rol == null ? null : (raiz, consulta, cb) -> cb.equal(raiz.get("rol"), rol);
    }

    static Specification<Usuario> conEstado(EstadoCuenta estado) {
        return estado == null ? null : (raiz, consulta, cb) -> cb.equal(raiz.get("estadoCuenta"), estado);
    }
}
