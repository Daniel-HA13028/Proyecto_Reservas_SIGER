package com.project.siger.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.project.siger.exception.CodigoError;
import com.project.siger.exception.NegocioException;

/**
 * Imágenes de los eventos: JPG o PNG de hasta 2 MB, guardadas en siger.imagenes.directorio con un nombre
 * aleatorio y servidas en /uploads/eventos/ (WebConfig). El tipo se comprueba por el contenido del archivo, no por
 * su nombre ni por el Content-Type que envía el navegador.
 */
@Service
public class ImagenService {

    public static final String RUTA_PUBLICA = "/uploads/eventos/";
    static final long TAMANO_MAXIMO = 2L * 1024 * 1024;
    private static final Logger log = LoggerFactory.getLogger(ImagenService.class);

    private final Path directorio;

    public ImagenService(@Value("${siger.imagenes.directorio:uploads}") String directorio) {
        this.directorio = Path.of(directorio).toAbsolutePath().normalize().resolve("eventos");
    }

    public Path directorioRaiz() {
        return directorio.getParent();
    }

    /** Guarda la imagen y devuelve su URL pública, o null si no se envió imagen. */
    public String guardar(MultipartFile imagen) {
        if (imagen == null || imagen.isEmpty()) {
            return null;
        }
        if (imagen.getSize() > TAMANO_MAXIMO) {
            throw new NegocioException(CodigoError.ARCHIVO_DEMASIADO_GRANDE);
        }
        String extension;
        try (InputStream entrada = imagen.getInputStream()) {
            extension = extension(entrada.readNBytes(8));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        if (extension == null) {
            throw new NegocioException(CodigoError.IMAGEN_INVALIDA);
        }
        String nombre = UUID.randomUUID() + extension;
        try {
            Files.createDirectories(directorio);
            try (InputStream entrada = imagen.getInputStream()) {
                Files.copy(entrada, directorio.resolve(nombre), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return RUTA_PUBLICA + nombre;
    }

    /** Borra la imagen anterior de un evento; si no existe, no hace nada. */
    public void borrar(String url) {
        if (url == null || !url.startsWith(RUTA_PUBLICA)) {
            return;
        }
        Path archivo = directorio.resolve(url.substring(RUTA_PUBLICA.length())).normalize();
        if (!archivo.startsWith(directorio)) {
            return;
        }
        try {
            Files.deleteIfExists(archivo);
        } catch (IOException e) {
            log.warn("No se pudo borrar la imagen {}: {}", archivo, e.getMessage());
        }
    }

    /** Firma de JPG (FF D8 FF) o PNG (89 50 4E 47 0D 0A 1A 0A). */
    static String extension(byte[] cabecera) {
        if (cabecera.length >= 3 && (cabecera[0] & 0xFF) == 0xFF && (cabecera[1] & 0xFF) == 0xD8 && (cabecera[2] & 0xFF) == 0xFF) {
            return ".jpg";
        }
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
        if (cabecera.length >= 8 && java.util.Arrays.equals(java.util.Arrays.copyOf(cabecera, 8), png)) {
            return ".png";
        }
        return null;
    }
}
