package com.project.siger.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.project.siger.model.TokenUsuario;
import com.project.siger.model.enums.TipoToken;

/** Tokens de verificación, recuperación, refresh y cambio de correo. Solo se guarda el hash. */
public interface TokenUsuarioRepository extends JpaRepository<TokenUsuario, Long> {

    Optional<TokenUsuario> findByTokenHashAndTipo(String tokenHash, TipoToken tipo);

    Optional<TokenUsuario> findByTokenHashAndTipoIn(String tokenHash, Collection<TipoToken> tipos);

    /** El código de recuperación más reciente sin usar (diagrama de secuencia E). */
    Optional<TokenUsuario> findFirstByUsuarioIdAndTipoAndUsadoFalseOrderByIdDesc(Long idUsuario, TipoToken tipo);

    /** ¿La cuenta tiene alguna sesión (refresh token) vigente? */
    boolean existsByUsuarioIdAndTipoAndUsadoFalseAndFechaExpiracionAfter(Long idUsuario, TipoToken tipo, OffsetDateTime fecha);

    /** Invalida los tokens vigentes de un tipo: códigos anteriores, enlaces anteriores o todas las sesiones. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE TokenUsuario t SET t.usado = true WHERE t.usuario.id = :idUsuario AND t.tipo = :tipo AND t.usado = false")
    int invalidar(@Param("idUsuario") Long idUsuario, @Param("tipo") TipoToken tipo);

    /** Limpieza periódica: tokens vencidos hace más de un día. */
    @Modifying
    @Query("DELETE FROM TokenUsuario t WHERE t.fechaExpiracion < :limite")
    int borrarVencidosAntesDe(@Param("limite") OffsetDateTime limite);
}
