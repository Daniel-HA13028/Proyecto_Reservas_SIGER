package com.project.siger.service;

import static com.project.siger.service.ExportadorTabla.FECHA;
import static com.project.siger.service.ExportadorTabla.FECHA_HORA;
import static com.project.siger.service.ExportadorTabla.ZONA;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import com.project.siger.dto.FormatoExportacion;
import com.project.siger.dto.response.UsuarioResponse;

/** Lista de usuarios en PDF o Excel con fecha de generación y solicitante  */
@Component
public class ExportadorUsuarios {

    private static final String[] COLUMNAS = {"Nombre", "Correo", "Rol", "Estado", "Correo verificado", "Registro", "Último acceso"};
    private static final float[] ANCHOS = {3.2f, 3.6f, 1.6f, 1.4f, 1.3f, 1.4f, 1.9f};

    private final ExportadorTabla exportador;

    public ExportadorUsuarios(ExportadorTabla exportador) {
        this.exportador = exportador;
    }

    public ExportadorTabla.Archivo exportar(FormatoExportacion formato, List<UsuarioResponse> filas, Map<String, Object> filtros,
            String solicitante) {
        return exportador.exportar(formato, new ExportadorTabla.Tabla("SIGER · Usuarios", "Usuarios", "usuarios_siger", List.of(),
                COLUMNAS, ANCHOS, filas.stream().map(ExportadorUsuarios::valores).toList(), "usuarios"), filtros, solicitante);
    }

    private static String[] valores(UsuarioResponse u) {
        return new String[] {
                u.nombres() + " " + u.apellidos(), u.correoElectronico(), u.rol().name(), u.estadoCuenta().name(),
                u.correoVerificado() ? "Sí" : "No",
                u.fechaRegistro() == null ? "" : u.fechaRegistro().atZoneSameInstant(ZONA).format(FECHA),
                u.ultimoAcceso() == null ? "—" : u.ultimoAcceso().atZoneSameInstant(ZONA).format(FECHA_HORA)};
    }
}
