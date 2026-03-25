package com.treeco.api.service;

import com.treeco.api.model.User;
import com.treeco.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class UserService {

	private final UserRepository userRepository;

	public UserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	// ── REGISTRO Y AUTENTICACIÓN ──────────────────────────────────────

	/**
	 * Registra un nuevo usuario en la base de datos.
	 * 
	 * @throws IllegalArgumentException si el email ya está registrado
	 */
	@Transactional
	public User registerUser(String username, String email, String password) {
		if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
			throw new IllegalArgumentException("Ese email ya está registrado");
		}
		User user = new User(username, email, password);
		return userRepository.save(user);
	}

	/**
	 * Verifica las credenciales de un usuario.
	 * 
	 * @return El usuario autenticado
	 * @throws NoSuchElementException   si el email no existe
	 * @throws IllegalArgumentException si la contraseña es incorrecta
	 */
	public User authenticate(String email, String password) {
		User user = userRepository.findByEmailIgnoreCase(email)
				.orElseThrow(() -> new NoSuchElementException("Usuario no encontrado"));

		if (!user.checkPassword(password)) {
			throw new IllegalArgumentException("Contraseña incorrecta");
		}
		return user;
	}

	// ── CONSULTAS ─────────────────────────────────────────────────────

	/**
	 * Devuelve todos los usuarios.
	 */
	public List<User> getUsers() {
		return userRepository.findAll();
	}

	/**
	 * Busca un usuario por ID.
	 * 
	 * @throws NoSuchElementException si no existe
	 */
	public User findById(Integer id) {
		return userRepository.findById(id)
				.orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + id));
	}

	/**
	 * Busca un usuario por email (case-insensitive).
	 * 
	 * @throws NoSuchElementException si no existe
	 */
	public User findByEmail(String email) {
		return userRepository.findByEmailIgnoreCase(email)
				.orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con email: " + email));
	}

	/**
	 * Versión Optional para cuando no queremos lanzar excepción.
	 */
	public Optional<User> findByEmailOptional(String email) {
		return userRepository.findByEmailIgnoreCase(email);
	}

	// ── MODIFICACIONES ────────────────────────────────────────────────

	/**
	 * Actualiza username y/o email de un usuario.
	 * 
	 * @throws IllegalArgumentException si el nuevo email ya está en uso por otro
	 *                                  usuario
	 */
	@Transactional
	public User updateUser(Integer id, String newUsername, String newEmail) {
		User user = findById(id);

		if (newUsername != null && !newUsername.isBlank()) {
			user.setUsername(newUsername);
		}

		if (newEmail != null && !newEmail.isBlank()) {
			Optional<User> conflict = userRepository.findByEmailIgnoreCase(newEmail);
			if (conflict.isPresent() && !conflict.get().getId().equals(id)) {
				throw new IllegalArgumentException("El email ya está en uso por otro usuario");
			}
			user.setEmail(newEmail);
		}

		return userRepository.save(user);
	}

	/**
	 * Cambia la contraseña de un usuario verificando la actual.
	 * 
	 * @throws IllegalArgumentException si la contraseña actual es incorrecta
	 */
	@Transactional
	public void changePassword(Integer id, String oldPassword, String newPassword) {
		User user = findById(id);

		if (!user.checkPassword(oldPassword)) {
			throw new IllegalArgumentException("Contraseña actual incorrecta");
		}
		user.setPassword(newPassword);
		userRepository.save(user);
	}

	/**
	 * Elimina un usuario por ID.
	 * 
	 * @throws NoSuchElementException si no existe
	 */
	@Transactional
	public void deleteUser(Integer id) {
		if (!userRepository.existsById(id)) {
			throw new NoSuchElementException("Usuario no encontrado con id: " + id);
		}
		userRepository.deleteById(id);
	}

	public List<User> searchByUsernameOrEmail(String q) {
		return userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q);
	}
}