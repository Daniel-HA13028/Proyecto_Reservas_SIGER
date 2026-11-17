package com.project.siger.service;

import java.util.Locale;
import java.util.Optional;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.project.siger.config.UsuarioAutenticado;
import com.project.siger.repository.UsuarioRepository;

/** Carga el usuario para Spring Security: por correo al iniciar sesión y por id en cada petición con JWT. */
@Service
public class UsuarioDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarios;

    public UsuarioDetailsServiceImpl(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioAutenticado loadUserByUsername(String correo) {
        return usuarios.findByCorreoElectronico(correo.trim().toLowerCase(Locale.ROOT))
                .map(UsuarioAutenticado::de)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
    }

    @Transactional(readOnly = true)
    public Optional<UsuarioAutenticado> cargarPorId(Long id) {
        return usuarios.findById(id).map(UsuarioAutenticado::de);
    }
}
