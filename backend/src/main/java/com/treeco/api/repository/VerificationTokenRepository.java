package com.treeco.api.repository;

import com.treeco.api.model.VerificationToken;
import com.treeco.api.model.VerificationToken.TokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {

    Optional<VerificationToken> findByToken(String token);

    /**
     * Invalida todos los tokens activos del usuario para un tipo concreto.
     * Se llama antes de emitir uno nuevo para evitar tokens paralelos.
     */
    @Modifying
    @Query("""
        UPDATE VerificationToken t
        SET t.used = true
        WHERE t.user.id = :userId
          AND t.type    = :type
          AND t.used    = false
        """)
    void invalidatePreviousTokens(@Param("userId") Integer userId,
                                  @Param("type")   TokenType type);

    /**
     * Limpieza periódica — se puede invocar desde un @Scheduled.
     */
    @Modifying
    @Query("DELETE FROM VerificationToken t WHERE t.used = true OR t.expiresAt < CURRENT_TIMESTAMP")
    void deleteExpiredAndUsed();
}