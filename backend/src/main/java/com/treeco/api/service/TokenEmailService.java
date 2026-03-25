package com.treeco.api.service;

import com.treeco.api.model.User;
import com.treeco.api.model.VerificationToken;
import com.treeco.api.model.VerificationToken.TokenType;
import com.treeco.api.repository.UserRepository;
import com.treeco.api.repository.VerificationTokenRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Servicio unificado para los dos flujos de verificación por código:
 *
 * 1. REGISTRO: los datos del usuario se guardan temporalmente en memoria
 * hasta que el código es confirmado. Solo entonces se crea la cuenta.
 *
 * 2. RESET DE CONTRASEÑA: flujo estándar con token en BD.
 */
@Service
public class TokenEmailService {

	// Hay que cambiar FROM_ADRESS por el correo una vez lo tengamos Raul (debe
	// coincidir con spring.mail.username)
	private static final String FROM_ADDRESS = "treeco.support@gmail.com";

	/**
	 * Almacén temporal de registros pendientes de verificar.
	 * Clave: email (lowercase). Valor: datos del registro + timestamp para
	 * expiración.
	 */
	private final Map<String, PendingRegistration> pendingRegistrations = new ConcurrentHashMap<>();

	private final VerificationTokenRepository tokenRepository;
	private final UserRepository userRepository;
	private final JavaMailSender mailSender;

	public TokenEmailService(VerificationTokenRepository tokenRepository,
			UserRepository userRepository,
			JavaMailSender mailSender) {
		this.tokenRepository = tokenRepository;
		this.userRepository = userRepository;
		this.mailSender = mailSender;
	}

	// ════════════════════════════════════════════
	// REGISTRO
	// ════════════════════════════════════════════

	/**
	 * Guarda los datos del registro en memoria y envía el código de 6 dígitos.
	 * La cuenta NO se crea todavía en la BD.
	 */
	@Transactional
	public void sendRegistrationCode(String username, String email, String password) {
		// Validación básica (el controller ya comprobó duplicados de email)
		if (username == null || username.trim().isEmpty())
			throw new IllegalArgumentException("El nombre de usuario no puede estar vacío");
		if (password == null || password.length() < 8)
			throw new IllegalArgumentException("La contraseña debe tener al menos 8 caracteres");

		String emailKey = email.toLowerCase();
		String code = generateCode();

		// Guardamos en memoria: si ya existía un intento previo, lo sobreescribimos
		pendingRegistrations.put(emailKey, new PendingRegistration(username.trim(), email, password, code));

		// Enviar email
		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
			helper.setFrom(FROM_ADDRESS);
			helper.setTo(email);
			helper.setSubject("Código de verificación - 🌿 TreeCO");

			String html = buildVerificationHtml(username.trim(), code);

			helper.setText(html, true);

			mailSender.send(message);
		} catch (MessagingException e) {
			System.out.println(e);
		}
	}

	/**
	 * Verifica el código de registro y, si es correcto, crea la cuenta en BD.
	 *
	 * @throws IllegalArgumentException si el código es incorrecto o ha expirado
	 * @return el User recién creado
	 */
	@Transactional
	public User confirmRegistration(String email, String code) {
		String emailKey = email.toLowerCase();
		PendingRegistration pending = pendingRegistrations.get(emailKey);

		if (pending == null) {
			throw new IllegalArgumentException(
					"No hay ningún registro pendiente para este email. Vuelve a introducir tus datos.");
		}
		if (pending.isExpired()) {
			pendingRegistrations.remove(emailKey);
			throw new IllegalArgumentException("El código ha expirado. Solicita uno nuevo.");
		}
		if (!pending.code().equals(code)) {
			throw new IllegalArgumentException("Código incorrecto");
		}

		// Código correcto → crear la cuenta
		// Doble check por si alguien se registró con el mismo email justo entre
		// el send-code y el confirm (muy improbable, pero seguro)
		if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
			pendingRegistrations.remove(emailKey);
			throw new IllegalArgumentException("El email ya está registrado");
		}

		User newUser = new User(pending.username(), pending.email(), pending.rawPassword());
		newUser.setEmailVerified(true);
		userRepository.save(newUser);
		pendingRegistrations.remove(emailKey);

		return newUser;
	}

	/**
	 * Reenvía el código de registro (genera uno nuevo, mantiene los datos del
	 * usuario).
	 *
	 * @throws IllegalArgumentException si no hay registro pendiente para ese email
	 */
	@Transactional
	public void resendRegistrationCode(String email) {
		String emailKey = email.toLowerCase();
		PendingRegistration pending = pendingRegistrations.get(emailKey);

		if (pending == null) {
			throw new IllegalArgumentException("No hay ningún registro pendiente para este email");
		}

		String newCode = generateCode();
		pendingRegistrations.put(emailKey, new PendingRegistration(
				pending.username(), pending.email(), pending.rawPassword(), newCode));

		try {
			MimeMessage message = mailSender.createMimeMessage();
			MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

			helper.setFrom(FROM_ADDRESS);
			helper.setTo(email);
			helper.setSubject("Reenviar código de verificación - 🌿 TreeCO");

			String html = buildVerificationHtml(pending.username(), newCode);

			helper.setText(html, true);
			mailSender.send(message);
		} catch (MessagingException e) {
			System.out.println(e);
		}

	}

	// ════════════════════════════════════════════
	// RESET DE CONTRASEÑA
	// ════════════════════════════════════════════

	/**
	 * Genera un token de reset y envía el email.
	 * Si el email no existe, no hace nada (sin revelar si está registrado).
	 */
	@Transactional
	public void sendPasswordResetEmail(String email) {
		userRepository.findByEmailIgnoreCase(email).ifPresent(user -> {
			tokenRepository.invalidatePreviousTokens(user.getId(), TokenType.PASSWORD_RESET);

			String code = generateCode();
			VerificationToken token = new VerificationToken(code, user, TokenType.PASSWORD_RESET);
			tokenRepository.save(token);

			try {
				MimeMessage message = mailSender.createMimeMessage();
				MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
				helper.setFrom(FROM_ADDRESS);
				helper.setTo(email);
				helper.setSubject("🔑 TreeCO — Restablece tu contraseña");

				String html = buildPasswordResetHtml(user.getUsername(), code);

				helper.setText(html, true);

				mailSender.send(message);
			} catch (MessagingException e) {
				System.out.println(e);
			}
		});
	}

	/**
	 * Valida el código de reset sin aplicar el cambio aún.
	 *
	 * @throws IllegalArgumentException si el código no es válido
	 */
	public void validatePasswordResetToken(String code) {
		findValidToken(code, TokenType.PASSWORD_RESET);
	}

	/**
	 * Valida el código y aplica la nueva contraseña en una operación atómica.
	 *
	 * @throws IllegalArgumentException si el código no es válido
	 */
	@Transactional
	public void resetPassword(String code, String newPassword) {
		VerificationToken token = findValidToken(code, TokenType.PASSWORD_RESET);

		User user = token.getUser();
		user.setPassword(newPassword);
		userRepository.save(user);

		token.markAsUsed();
		tokenRepository.save(token);
	}

	// ════════════════════════════════════════════
	// Helpers privados
	// ════════════════════════════════════════════

	private VerificationToken findValidToken(String code, TokenType expectedType) {
		VerificationToken token = tokenRepository.findByToken(code)
				.orElseThrow(() -> new IllegalArgumentException("Código incorrecto"));

		if (token.getType() != expectedType)
			throw new IllegalArgumentException("Código incorrecto");
		if (token.isExpired())
			throw new IllegalArgumentException("El código ha expirado. Solicita uno nuevo.");
		if (token.isUsed())
			throw new IllegalArgumentException("El código ya fue utilizado.");

		return token;
	}

	private String generateCode() {
		SecureRandom rng = new SecureRandom();
		return String.valueOf(100_000 + rng.nextInt(900_000));
	}

	// ════════════════════════════════════════════
	// HTML builders
	// ════════════════════════════════════════════

	private Object[] splitDigits(String code) {
		Object[] chars = new Object[6];
		for (int i = 0; i < 6; i++) chars[i] = code.charAt(i);
		return chars;
	}

	private String buildVerificationHtml(String username, String code) {
		Object[] d = splitDigits(code);
		return """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Código de verificación — TreeCO</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    /* ── Dark mode overrides ── */
    @media (prefers-color-scheme: dark) {
      .email-body    { background-color: #050a08 !important; }
      .email-outer   { background-color: #050a08 !important; }
      .email-card    { background: linear-gradient(160deg,rgba(255,255,255,0.055) 0%%,rgba(255,255,255,0.02) 100%%) !important; border-color: rgba(255,255,255,0.12) !important; }
      .email-header  { background: radial-gradient(ellipse 100%% 160%% at 50%% 0%%,rgba(61,220,132,0.08) 0%%,transparent 60%%) !important; border-color: rgba(255,255,255,0.07) !important; }
      .text-logo     { color: rgba(255,255,255,0.92) !important; }
      .text-eyebrow  { color: rgba(61,220,132,0.65) !important; }
      .text-meta     { color: rgba(255,255,255,0.22) !important; }
      .text-title    { color: rgba(255,255,255,0.92) !important; }
      .text-body     { color: rgba(255,255,255,0.42) !important; }
      .text-step     { color: rgba(255,255,255,0.38) !important; }
      .text-notice   { color: rgba(255,255,255,0.3) !important; }
      .text-footer   { color: rgba(255,255,255,0.14) !important; }
      .text-footer2  { color: rgba(255,255,255,0.1) !important; }
      .text-expiry   { color: rgba(255,255,255,0.22) !important; }
      .text-expiry-hi{ color: rgba(255,255,255,0.45) !important; }
      .divider       { background: linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent) !important; }
      .card-divider  { border-color: rgba(255,255,255,0.06) !important; }
      .footer-divider{ border-color: rgba(255,255,255,0.05) !important; }
      .code-box      { background: linear-gradient(135deg,rgba(61,220,132,0.07) 0%%,rgba(61,220,132,0.025) 100%%) !important; border-color: rgba(61,220,132,0.22) !important; }
      .digit         { color: #3ddc84 !important; background: rgba(61,220,132,0.07) !important; border-color: rgba(61,220,132,0.2) !important; }
      .step-num-green{ color: #3ddc84 !important; background: rgba(61,220,132,0.1) !important; border-color: rgba(61,220,132,0.22) !important; }
      .notice-box    { background: rgba(255,255,255,0.025) !important; border-color: rgba(61,220,132,0.3) !important; }
      .notice-label  { color: rgba(61,220,132,0.45) !important; }
      .top-line      { background: linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent) !important; }
      .bottom-line   { background: linear-gradient(90deg,transparent,rgba(61,220,132,0.08),transparent) !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#f0f4f2;font-family:'Sora',sans-serif;-webkit-font-smoothing:antialiased;">
<table class="email-outer" role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f2;min-height:100vh;">
  <tr><td align="center" style="padding:48px 16px 64px;">

    <!-- LOGO -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr><td align="center">
        <div style="display:inline-block;width:48px;height:48px;border-radius:50%%;background:rgba(61,220,132,0.15);border:1px solid rgba(61,220,132,0.3);line-height:48px;text-align:center;font-size:22px;margin-bottom:14px;">🌿</div><br/>
        <span class="text-logo" style="font-family:'Sora',sans-serif;font-size:28px;font-weight:700;color:#0d1610;letter-spacing:-0.03em;">Tree<span style="color:#3ddc84;">CO</span></span>
      </td></tr>
    </table>

    <!-- CARD -->
    <table class="email-card" role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
      style="max-width:560px;width:100%%;background:#ffffff;border:1px solid #e2ede8;border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.04);">

      <!-- TOP LINE -->
      <tr><td class="top-line" style="height:3px;background:linear-gradient(90deg,transparent,rgba(61,220,132,0.6),transparent);border-radius:24px 24px 0 0;font-size:0;line-height:0;"></td></tr>

      <!-- HEADER -->
      <tr><td class="email-header" style="padding:32px 44px 28px;background:#f8fcfa;border-bottom:1px solid #e8f0eb;">
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;">
            <p class="text-eyebrow" style="margin:0 0 5px;font-family:'DM Mono','Courier New',monospace;font-size:10px;font-weight:500;color:#2a9d5c;letter-spacing:0.16em;text-transform:uppercase;">Verificación de cuenta</p>
            <p class="text-meta" style="margin:0;font-size:11px;color:#8aa898;font-family:'DM Mono','Courier New',monospace;letter-spacing:0.05em;">treeco.app · no-reply</p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="display:inline-block;font-family:'DM Mono','Courier New',monospace;font-size:9px;font-weight:500;color:#1e8c4a;letter-spacing:0.14em;text-transform:uppercase;background:rgba(61,220,132,0.12);border:1px solid rgba(61,220,132,0.35);padding:6px 14px;border-radius:9999px;">● Acción requerida</span>
          </td>
        </tr></table>
      </td></tr>

      <!-- GREETING -->
      <tr><td style="padding:36px 44px 10px;">
        <p class="text-title" style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d1f15;letter-spacing:-0.025em;line-height:1.2;">Hola, <span style="color:#3ddc84;">%s</span> 👋</p>
        <p class="text-body" style="margin:0;font-size:14px;color:#5a7a65;line-height:1.75;">Para completar tu registro en TreeCO, introduce el código de 6 dígitos que aparece a continuación.</p>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:22px 44px 0;"><div class="divider" style="height:1px;background:linear-gradient(90deg,transparent,#d4e8db,transparent);"></div></td></tr>

      <!-- CODE BLOCK -->
      <tr><td style="padding:28px 44px 24px;">
        <table class="code-box" role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
          style="background:linear-gradient(135deg,rgba(61,220,132,0.06) 0%%,rgba(61,220,132,0.02) 100%%);border:1px solid rgba(61,220,132,0.25);border-radius:18px;">
          <tr><td align="center" style="padding:36px 24px 32px;">
            <p style="margin:0 0 20px;font-family:'DM Mono','Courier New',monospace;font-size:9px;font-weight:500;color:#2a9d5c;letter-spacing:0.2em;text-transform:uppercase;">Código de verificación</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%2$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%3$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%4$c</span></td>
              <td style="padding:0 6px;vertical-align:middle;font-size:20px;color:rgba(61,220,132,0.4);">·</td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%5$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%6$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%7$c</span></td>
            </tr></table>
            <p class="text-expiry" style="margin:22px 0 0;font-family:'DM Mono','Courier New',monospace;font-size:11px;color:#8aa898;">Expira en <span class="text-expiry-hi" style="color:#3d6650;font-weight:500;">10 minutos</span> · Uso único</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- STEPS -->
      <tr><td style="padding:0 44px 28px;">
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:3px;"><span class="step-num-green" style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%%;background:rgba(61,220,132,0.12);border:1px solid rgba(61,220,132,0.3);font-family:'DM Mono',monospace;font-size:9px;color:#1e8c4a;font-weight:500;">1</span></td>
            <td class="text-step" style="font-size:13px;color:#5a7a65;line-height:1.6;">Abre TreeCO y dirígete a la pantalla de verificación</td>
          </tr></table></td></tr>
          <tr><td style="padding:0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:3px;"><span class="step-num-green" style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%%;background:rgba(61,220,132,0.12);border:1px solid rgba(61,220,132,0.3);font-family:'DM Mono',monospace;font-size:9px;color:#1e8c4a;font-weight:500;">2</span></td>
            <td class="text-step" style="font-size:13px;color:#5a7a65;line-height:1.6;">Introduce los 6 dígitos del código de arriba</td>
          </tr></table></td></tr>
          <tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:3px;"><span class="step-num-green" style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%%;background:rgba(61,220,132,0.12);border:1px solid rgba(61,220,132,0.3);font-family:'DM Mono',monospace;font-size:9px;color:#1e8c4a;font-weight:500;">3</span></td>
            <td class="text-step" style="font-size:13px;color:#5a7a65;line-height:1.6;">Tu cuenta quedará activada al instante ✓</td>
          </tr></table></td></tr>
        </table>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:0 44px 24px;"><div class="divider" style="height:1px;background:linear-gradient(90deg,transparent,#d4e8db,transparent);"></div></td></tr>

      <!-- NOTICE -->
      <tr><td style="padding:0 44px 32px;">
        <table class="notice-box" role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
          style="background:#f2faf5;border-radius:12px;border-left:3px solid rgba(61,220,132,0.5);">
          <tr><td style="padding:16px 20px;">
            <p class="notice-label" style="margin:0 0 4px;font-family:'DM Mono','Courier New',monospace;font-size:9px;font-weight:500;color:#2a9d5c;letter-spacing:0.14em;text-transform:uppercase;">Nota de seguridad</p>
            <p class="text-notice" style="margin:0;font-size:12px;color:#6a8c76;line-height:1.7;">Si no has creado ninguna cuenta en TreeCO, puedes ignorar este mensaje con total seguridad.</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:20px 44px 28px;border-top:1px solid #e8f0eb;">
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td><p class="text-footer" style="margin:0;font-size:11px;font-family:'DM Mono','Courier New',monospace;color:#9ab8a4;letter-spacing:0.04em;">Tree<span style="color:#3ddc84;">CO</span> · treeco.support@gmail.com</p></td>
          <td align="right"><p class="text-footer2" style="margin:0;font-size:10px;font-family:'DM Mono','Courier New',monospace;color:#b8ccc0;">© 2025 TreeCO</p></td>
        </tr></table>
      </td></tr>

      <!-- BOTTOM LINE -->
      <tr><td class="bottom-line" style="height:3px;background:linear-gradient(90deg,transparent,rgba(61,220,132,0.4),transparent);border-radius:0 0 24px 24px;font-size:0;line-height:0;"></td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
""".formatted(username, d[0], d[1], d[2], d[3], d[4], d[5]);
	}

	private String buildPasswordResetHtml(String username, String code) {
		Object[] d = splitDigits(code);
		return """
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Restablecer contraseña — TreeCO</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-body    { background-color: #050a08 !important; }
      .email-outer   { background-color: #050a08 !important; }
      .email-card    { background: linear-gradient(160deg,rgba(255,255,255,0.05) 0%%,rgba(255,255,255,0.018) 100%%) !important; border-color: rgba(255,255,255,0.11) !important; }
      .email-header  { background: radial-gradient(ellipse 100%% 160%% at 50%% 0%%,rgba(255,190,60,0.07) 0%%,transparent 60%%) !important; border-color: rgba(255,255,255,0.07) !important; }
      .text-logo     { color: rgba(255,255,255,0.92) !important; }
      .text-eyebrow  { color: rgba(255,190,60,0.65) !important; }
      .text-meta     { color: rgba(255,255,255,0.22) !important; }
      .text-title    { color: rgba(255,255,255,0.92) !important; }
      .text-body     { color: rgba(255,255,255,0.4) !important; }
      .text-body strong { color: rgba(255,255,255,0.75) !important; }
      .text-step     { color: rgba(255,255,255,0.35) !important; }
      .text-steps-label { color: rgba(255,255,255,0.2) !important; }
      .text-notice   { color: rgba(255,255,255,0.28) !important; }
      .text-footer   { color: rgba(255,255,255,0.14) !important; }
      .text-footer2  { color: rgba(255,255,255,0.1) !important; }
      .text-expiry   { color: rgba(255,255,255,0.22) !important; }
      .text-expiry-hi{ color: rgba(255,255,255,0.45) !important; }
      .divider       { background: linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent) !important; }
      .footer-divider{ border-color: rgba(255,255,255,0.05) !important; }
      .code-box      { background: linear-gradient(135deg,rgba(61,220,132,0.06) 0%%,rgba(61,220,132,0.02) 100%%) !important; border-color: rgba(61,220,132,0.2) !important; }
      .digit         { color: #3ddc84 !important; background: rgba(61,220,132,0.07) !important; border-color: rgba(61,220,132,0.2) !important; }
      .step-num-amber{ color: #ffbe3c !important; background: rgba(255,190,60,0.08) !important; border-color: rgba(255,190,60,0.2) !important; }
      .notice-box    { background: rgba(255,190,60,0.03) !important; border-color: rgba(255,190,60,0.35) !important; }
      .notice-label  { color: rgba(255,190,60,0.5) !important; }
      .top-line      { background: linear-gradient(90deg,transparent,rgba(255,190,60,0.35),transparent) !important; }
      .bottom-line   { background: linear-gradient(90deg,transparent,rgba(255,190,60,0.08),transparent) !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#faf8f0;font-family:'Sora',sans-serif;-webkit-font-smoothing:antialiased;">
<table class="email-outer" role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf8f0;min-height:100vh;">
  <tr><td align="center" style="padding:48px 16px 64px;">

    <!-- LOGO -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr><td align="center">
        <div style="display:inline-block;width:48px;height:48px;border-radius:50%%;background:rgba(255,190,60,0.15);border:1px solid rgba(255,190,60,0.35);line-height:48px;text-align:center;font-size:22px;margin-bottom:14px;">🔑</div><br/>
        <span class="text-logo" style="font-family:'Sora',sans-serif;font-size:28px;font-weight:700;color:#1a1408;letter-spacing:-0.03em;">Tree<span style="color:#3ddc84;">CO</span></span>
      </td></tr>
    </table>

    <!-- CARD -->
    <table class="email-card" role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
      style="max-width:560px;width:100%%;background:#ffffff;border:1px solid #ede8d6;border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.04);">

      <!-- TOP LINE — amber -->
      <tr><td class="top-line" style="height:3px;background:linear-gradient(90deg,transparent,rgba(255,190,60,0.7),transparent);border-radius:24px 24px 0 0;font-size:0;line-height:0;"></td></tr>

      <!-- HEADER -->
      <tr><td class="email-header" style="padding:32px 44px 28px;background:#fdfaf0;border-bottom:1px solid #ede8d6;">
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;">
            <p class="text-eyebrow" style="margin:0 0 5px;font-family:'DM Mono','Courier New',monospace;font-size:10px;font-weight:500;color:#b87d10;letter-spacing:0.16em;text-transform:uppercase;">Restablecimiento de contraseña</p>
            <p class="text-meta" style="margin:0;font-size:11px;color:#b8a87a;font-family:'DM Mono','Courier New',monospace;letter-spacing:0.05em;">treeco.app · seguridad</p>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="display:inline-block;font-family:'DM Mono','Courier New',monospace;font-size:9px;font-weight:500;color:#a06010;letter-spacing:0.14em;text-transform:uppercase;background:rgba(255,190,60,0.15);border:1px solid rgba(255,190,60,0.45);padding:6px 14px;border-radius:9999px;">⚠ Seguridad</span>
          </td>
        </tr></table>
      </td></tr>

      <!-- GREETING -->
      <tr><td style="padding:36px 44px 10px;">
        <p class="text-title" style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1a1408;letter-spacing:-0.025em;line-height:1.2;">Restablecer contraseña 🔑</p>
        <p class="text-body" style="margin:0;font-size:14px;color:#7a6a40;line-height:1.75;">Hola, <strong style="color:#3d2e08;font-weight:600;">%s</strong>. Hemos recibido una solicitud para restablecer la contraseña de tu cuenta TreeCO.</p>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:22px 44px 0;"><div class="divider" style="height:1px;background:linear-gradient(90deg,transparent,#e8dfc0,transparent);"></div></td></tr>

      <!-- CODE BLOCK -->
      <tr><td style="padding:28px 44px 24px;">
        <table class="code-box" role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
          style="background:linear-gradient(135deg,rgba(61,220,132,0.06) 0%%,rgba(61,220,132,0.02) 100%%);border:1px solid rgba(61,220,132,0.22);border-radius:18px;">
          <tr><td align="center" style="padding:36px 24px 32px;">
            <p style="margin:0 0 20px;font-family:'DM Mono','Courier New',monospace;font-size:9px;font-weight:500;color:#2a9d5c;letter-spacing:0.2em;text-transform:uppercase;">Código de recuperación</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%2$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%3$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%4$c</span></td>
              <td style="padding:0 6px;vertical-align:middle;font-size:20px;color:rgba(61,220,132,0.4);">·</td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%5$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%6$c</span></td>
              <td style="padding:0 4px;"><span class="digit" style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;font-family:'DM Mono','Courier New',monospace;font-size:28px;font-weight:500;color:#1a7a40;background:rgba(61,220,132,0.1);border:1px solid rgba(61,220,132,0.25);border-radius:10px;">%7$c</span></td>
            </tr></table>
            <p class="text-expiry" style="margin:22px 0 0;font-family:'DM Mono','Courier New',monospace;font-size:11px;color:#a89870;">Expira en <span class="text-expiry-hi" style="color:#5a4a20;font-weight:500;">10 min</span> · Solo puede usarse <span class="text-expiry-hi" style="color:#5a4a20;font-weight:500;">una vez</span></p>
          </td></tr>
        </table>
      </td></tr>

      <!-- STEPS -->
      <tr><td style="padding:0 44px 28px;">
        <p class="text-steps-label" style="margin:0 0 14px;font-family:'DM Mono','Courier New',monospace;font-size:9px;font-weight:500;color:#b8a060;letter-spacing:0.14em;text-transform:uppercase;">¿Qué ocurre después?</p>
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:2px;"><span class="step-num-amber" style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%%;background:rgba(255,190,60,0.15);border:1px solid rgba(255,190,60,0.35);font-family:'DM Mono',monospace;font-size:9px;color:#a06010;font-weight:500;">1</span></td>
            <td class="text-step" style="font-size:13px;color:#7a6a40;line-height:1.6;">Introduce el código en la pantalla de recuperación</td>
          </tr></table></td></tr>
          <tr><td style="padding:0 0 10px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:2px;"><span class="step-num-amber" style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%%;background:rgba(255,190,60,0.15);border:1px solid rgba(255,190,60,0.35);font-family:'DM Mono',monospace;font-size:9px;color:#a06010;font-weight:500;">2</span></td>
            <td class="text-step" style="font-size:13px;color:#7a6a40;line-height:1.6;">Establece tu nueva contraseña (mín. 8 caracteres)</td>
          </tr></table></td></tr>
          <tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="padding-right:12px;vertical-align:top;padding-top:2px;"><span class="step-num-amber" style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:50%%;background:rgba(255,190,60,0.15);border:1px solid rgba(255,190,60,0.35);font-family:'DM Mono',monospace;font-size:9px;color:#a06010;font-weight:500;">3</span></td>
            <td class="text-step" style="font-size:13px;color:#7a6a40;line-height:1.6;">Accede normalmente con tus nuevas credenciales ✓</td>
          </tr></table></td></tr>
        </table>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:0 44px 24px;"><div class="divider" style="height:1px;background:linear-gradient(90deg,transparent,#e8dfc0,transparent);"></div></td></tr>

      <!-- NOTICE -->
      <tr><td style="padding:0 44px 32px;">
        <table class="notice-box" role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"
          style="background:#fffbf0;border-radius:12px;border-left:3px solid rgba(255,190,60,0.6);">
          <tr><td style="padding:16px 20px;">
            <p class="notice-label" style="margin:0 0 4px;font-family:'DM Mono','Courier New',monospace;font-size:9px;font-weight:500;color:#b87d10;letter-spacing:0.14em;text-transform:uppercase;">⚠ Aviso de seguridad</p>
            <p class="text-notice" style="margin:0;font-size:12px;color:#8a7040;line-height:1.7;">Si no has solicitado este cambio, ignora este mensaje. Tu contraseña actual no se modificará y tu cuenta permanece segura.</p>
          </td></tr>
        </table>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="padding:20px 44px 28px;border-top:1px solid #ede8d6;">
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td><p class="text-footer" style="margin:0;font-size:11px;font-family:'DM Mono','Courier New',monospace;color:#c8b880;letter-spacing:0.04em;">Tree<span style="color:#3ddc84;">CO</span> · treeco.support@gmail.com</p></td>
          <td align="right"><p class="text-footer2" style="margin:0;font-size:10px;font-family:'DM Mono','Courier New',monospace;color:#d8cc98;">© 2025 TreeCO</p></td>
        </tr></table>
      </td></tr>

      <!-- BOTTOM LINE -->
      <tr><td class="bottom-line" style="height:3px;background:linear-gradient(90deg,transparent,rgba(255,190,60,0.45),transparent);border-radius:0 0 24px 24px;font-size:0;line-height:0;"></td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>
""".formatted(username, d[0], d[1], d[2], d[3], d[4], d[5]);
	}

	// ════════════════════════════════════════════
	// Record interno: registro pendiente
	// ════════════════════════════════════════════

	/**
	 * Datos temporales de un registro pendiente de verificar.
	 * Expira 10 minutos después de su creación.
	 */
	private record PendingRegistration(
			String username,
			String email,
			String rawPassword, // contraseña en texto plano — se hashea al crear la cuenta
			String code,
			LocalDateTime createdAt) {
		PendingRegistration(String username, String email, String rawPassword, String code) {
			this(username, email, rawPassword, code, LocalDateTime.now());
		}

		boolean isExpired() {
			return LocalDateTime.now().isAfter(createdAt.plusMinutes(10));
		}
	}
}