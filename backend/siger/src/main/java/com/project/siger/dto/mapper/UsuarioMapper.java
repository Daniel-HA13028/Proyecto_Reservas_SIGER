package com.project.siger.dto.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import com.project.siger.dto.response.UsuarioResponse;
import com.project.siger.model.Usuario;

/** Usuario → UsuarioResponse. Nunca expone el hash de la contraseña. */
@Mapper
public interface UsuarioMapper {

    @Mapping(target = "idUsuario", source = "id")
    UsuarioResponse aRespuesta(Usuario usuario);
}
