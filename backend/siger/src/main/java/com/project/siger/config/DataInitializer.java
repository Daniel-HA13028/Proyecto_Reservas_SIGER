package com.project.siger.config;

import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.project.siger.repository.UsuarioRepository;
import com.project.siger.model.Usuario;
import com.project.siger.model.enums.EstadoCuenta;
import com.project.siger.model.enums.Rol;


@Component
@EnableConfigurationProperties(AdminInicialProperties.class)
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final AdminInicialProperties admin;

    public DataInitializer(UsuarioRepository usuarios, PasswordEncoder passwordEncoder, AdminInicialProperties admin) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.admin = admin;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (usuarios.existsByRol(Rol.Administrador)) {
            return;
        }
        if (admin.correo() == null || admin.correo().isBlank() || admin.contrasena() == null || admin.contrasena().isBlank()) {
            throw new IllegalStateException("No hay ningún Administrador. Define SIGER_ADMIN_CORREO y SIGER_ADMIN_CONTRASENA "
                    + "para crear el administrador inicial.");
        }
        if (!admin.contrasena().matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\w\\s]).{8,}$")) {
            throw new IllegalStateException("SIGER_ADMIN_CONTRASENA no cumple la política de contraseñas (RNF-01): "
                + "debe tener al menos 8 caracteres, una letra mayúscula, una letra minúscula, un número y un carácter especial.");
        }
        String correo = admin.correo().trim().toLowerCase(Locale.ROOT);
        if (usuarios.existsByCorreoElectronico(correo)) {
            throw new IllegalStateException("El correo del administrador inicial ya pertenece a otra cuenta: " + correo);
        }

        Usuario u = new Usuario();
        u.setNombres(admin.nombres());
        u.setApellidos(admin.apellidos());
        u.setCorreoElectronico(correo);
        u.setContrasenaHash(passwordEncoder.encode(admin.contrasena()));
        u.setRol(Rol.Administrador);
        u.setEstadoCuenta(EstadoCuenta.Activo);
        u.setCorreoVerificado(true);
        usuarios.save(u);
        log.info("Administrador inicial creado: {}", correo);
    }
}
