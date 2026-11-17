package com.project.siger.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;


@ConfigurationProperties("siger.cors")
public record CorsProperties(List<String> origenes) {

    @SuppressWarnings(value = { "" })
    public CorsProperties {
        origenes = origenes == null ? List.of()
                : origenes.stream().map(String::trim).filter(o -> !o.isEmpty()).toList();
    }
}
