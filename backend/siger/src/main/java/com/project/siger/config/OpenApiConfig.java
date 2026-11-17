package com.project.siger.config;

import com.project.siger.exception.ErrorResponse;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.Map;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class OpenApiConfig {

    private static final String ERROR_REF = "#/components/schemas/ErrorResponse";

    @Bean
    public OpenAPI sigerOpenApi() {
        Components components = new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
                        .description("Access token JWT de 30 minutos (RNF-02)."));
        ModelConverters.getInstance().readAll(ErrorResponse.class).forEach(components::addSchemas);
        String[][] respuestas = {
                {"SolicitudInvalida", "400 · JSON mal formado o parámetro con tipo incorrecto."},
                {"NoAutenticado", "401 · Falta el token, es inválido o venció."},
                {"SinPermiso", "403 · El rol no tiene acceso o el recurso es de otro usuario (RN-03)."},
                {"NoEncontrado", "404 · El recurso no existe."},
                {"Conflicto", "409 · Viola una regla de negocio (RN) o una restricción única."},
                {"ValidacionFallida", "422 · Datos inválidos; detalles tiene el error de cada campo."},
                {"DemasiadasSolicitudes", "429 · Se superó el límite de intentos (Bucket4j)."}
        };
        for (String[] r : respuestas) {
            components.addResponses(r[0], error(r[1]));
        }
        return new OpenAPI()
                .info(new Info().title("SIGER API").version("1.0.0")
                        .description("Contrato de la API REST del Sistema Inteligente de Gestión de Eventos y Reservaciones (T-01-02). "
                                + "Fechas en ISO-8601 con zona (OffsetDateTime); montos en US$; paginación desde 1."))
                .addServersItem(new Server().url("http://localhost:8080").description("Desarrollo"))
                .components(components);
    }

    /** Agrega a cada operación las respuestas de error que le corresponden. */
    @Bean
    public OpenApiCustomizer respuestasDeError() {
        return openApi -> openApi.getPaths().forEach((ruta, item) -> item.readOperations().forEach(op -> {
            ApiResponses r = op.getResponses();
            boolean segura = op.getSecurity() != null && !op.getSecurity().isEmpty();
            r.addApiResponse("400", ref("SolicitudInvalida"));
            if (segura) {
                r.addApiResponse("401", ref("NoAutenticado"));
                r.addApiResponse("403", ref("SinPermiso"));
            }
            if (ruta.contains("{")) {
                r.addApiResponse("404", ref("NoEncontrado"));
            }
            if (op.getRequestBody() != null) {
                r.addApiResponse("422", ref("ValidacionFallida"));
            }
            // Errores propios de la operación, declarados en @Operation(extensions = @Extension(name = "x-errores", ...))
            if (op.getExtensions() != null && op.getExtensions().get("x-errores") instanceof Map<?, ?> errores) {
                errores.forEach((codigo, nombre) -> r.addApiResponse(String.valueOf(codigo), ref(String.valueOf(nombre))));
                op.getExtensions().remove("x-errores");
            }
        }));
    }

    private static ApiResponse error(String descripcion) {
        return new ApiResponse().description(descripcion).content(new Content()
                .addMediaType("application/json", new MediaType().schema(new Schema<>().$ref(ERROR_REF))));
    }

    private static ApiResponse ref(String nombre) {
        return new ApiResponse().$ref("#/components/responses/" + nombre);
    }
}
