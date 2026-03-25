package com.treeco.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.treeco.api.model.User;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmailIgnoreCase(String email);

    /**
     * Busca usuarios cuyo username o email contenga el término (case-insensitive).
     * Devuelve máximo 10 resultados para uso en autocompletado.
     */
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(u.email)    LIKE LOWER(CONCAT('%', :q, '%')) " +
           "ORDER BY u.username ASC")
    List<User> searchByUsernameOrEmail(@Param("q") String q);
		
		List<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(
			String username, String email
		);
}