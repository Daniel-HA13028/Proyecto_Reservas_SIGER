package com.project.siger.config;

import java.util.concurrent.TimeUnit;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import com.project.siger.service.ImagenService;


@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final ImagenService imagenes;

    public WebConfig(ImagenService imagenes) {
        this.imagenes = imagenes;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registro) {
        // Los nombres son aleatorios y no cambian: el navegador puede guardarlas en caché una semana.
        String ubicacion = imagenes.directorioRaiz().toUri().toString();
        registro.addResourceHandler("/uploads/**")
                .addResourceLocations(ubicacion.endsWith("/") ? ubicacion : ubicacion + "/")
                .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());
    }
}
