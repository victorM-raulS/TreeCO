package com.treeco.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Token de verificación de un solo uso.
 * Sirve para dos flujos:
 *   - EMAIL_VERIFICATION : confirmar el email al registrarse
 *   - PASSWORD_RESET     : restablecer la contraseña
*/
@Entity
@Table(name = "verification_token", indexes = {
	@Index(name = "idx_vt_token",   columnList = "token"),
	@Index(name = "idx_vt_user_id", columnList = "user_id"),
	@Index(name = "idx_vt_type",    columnList = "type")
})

public class VerificationToken {
	
	public enum TokenType {
		EMAIL_VERIFICATION,
		PASSWORD_RESET
	}
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	/** Código numérico de 6 dígitos enviado al usuario. */
	@Column(nullable = false, length = 6)
	private String token;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private TokenType type;
	
	/** Expira 10 minutos después de la creación. */
	@Column(nullable = false)
	private LocalDateTime expiresAt;
	
	@Column(nullable = false)
	private boolean used = false;
	
	@Column(nullable = false)
	private LocalDateTime createdAt;
	
	public VerificationToken() {}
	
	public VerificationToken(String token, User user, TokenType type) {
		this.token     = token;
		this.user      = user;
		this.type      = type;
		this.createdAt = LocalDateTime.now();
		this.expiresAt = LocalDateTime.now().plusMinutes(10);
	}
	
	/* ── Getters ────────────────────────────────── */
	
	public Long getId()             { return id; }
	public String getToken()        { return token; }
	public User getUser()           { return user; }
	public TokenType getType()      { return type; }
	public LocalDateTime getExpiresAt() { return expiresAt; }
	public boolean isUsed()         { return used; }
	public LocalDateTime getCreatedAt() { return createdAt; }
	public void setUsed(boolean used)   { this.used = used; }
	
	/* ── Lógica ─────────────────────────────────── */
	
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !used && !isExpired();
    }

    public void markAsUsed() {
        this.used = true;
    }
}