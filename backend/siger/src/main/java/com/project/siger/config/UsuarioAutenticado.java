package com.project.siger.config;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.model.enums.Rol;


public record UsuarioAutenticado(Long id, String correo, String contrasenaHash, Rol rol, EstadoCuenta estado)
        implements UserDetails {

    public static UsuarioAutenticado de(Usuario u) {
        return new UsuarioAutenticado(u.getId(), u.getCorreoElectronico(), u.getContrasenaHash(), u.getRol(),
                u.getEstadoCuenta());
    }

    public static String autoridad(Rol rol) {
        return "ROLE_" + rol.name().toUpperCase(Locale.ROOT);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(autoridad(rol)));
    }

    @Override
    public String getPassword() {
        return contrasenaHash;
    }

    @Override
    public String getUsername() {
        return correo;
    }

    // El estado de la cuenta lo revisa AuthService después de comprobar la contraseña,
    // para no revelar si una cuenta existe a quien no conoce su contraseña.
}
