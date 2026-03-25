package com.treeco.api.controller;

import com.treeco.api.dto.user.*;
import com.treeco.api.model.Task;
import com.treeco.api.model.User;
import com.treeco.api.service.TaskService;
import com.treeco.api.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

	private final UserService userService;
	private final TaskService taskService;

	public UserController(UserService userService, TaskService taskService) {
		this.userService = userService;
		this.taskService = taskService;
	}

	// GET /api/users
	@GetMapping
	public ResponseEntity<List<User>> getAllUsers() {
		return ResponseEntity.ok(userService.getUsers());
	}

	// GET /api/users/{id}
	@GetMapping("/{id}")
	public ResponseEntity<?> getUserById(@PathVariable Integer id) {
		try {
			return ResponseEntity.ok(userService.findById(id));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		}
	}

	// PUT /api/users/{id}
	@PutMapping("/{id}")
	public ResponseEntity<?> updateUser(@PathVariable Integer id,
			@RequestBody UpdateUserRequest request) {
		try {
			User updated = userService.updateUser(id, request.getUsername(), request.getEmail());
			return ResponseEntity.ok(updated);
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(Map.of("error", e.getMessage()));
		}
	}

	// PUT /api/users/{id}/password
	@PutMapping("/{id}/password")
	public ResponseEntity<?> changePassword(@PathVariable Integer id,
			@RequestBody ChangePasswordRequest request) {
		try {
			userService.changePassword(id, request.getOldPassword(), request.getNewPassword());
			return ResponseEntity.ok(Map.of("message", "Contraseña actualizada correctamente"));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		} catch (IllegalArgumentException e) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(Map.of("error", e.getMessage()));
		}
	}
	
	@GetMapping("/search")
	public ResponseEntity<?> searchUsers(@RequestParam String q) {
		if (q == null || q.isBlank()) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(Map.of("error", "El parámetro 'q' es obligatorio"));
		}
		List<User> results = userService.searchByUsernameOrEmail(q.trim());
		return ResponseEntity.ok(results);
	}

	// DELETE /api/users/{id}
	@DeleteMapping("/{id}")
	public ResponseEntity<?> deleteUser(@PathVariable Integer id) {
		try {
			userService.deleteUser(id);
			return ResponseEntity.ok(Map.of("message", "Usuario eliminado correctamente"));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		}
	}

	// GET /api/users/{id}/projects
	@GetMapping("/{id}/projects")
	public ResponseEntity<?> getUserProjects(@PathVariable Integer id) {
		try {
			return ResponseEntity.ok(userService.findById(id).getProjects());
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		}
	}

	// GET /api/users/{id}/tasks
	@GetMapping("/{id}/tasks")
	public ResponseEntity<?> getAllUserTasks(@PathVariable Integer id) {
		try {
			return ResponseEntity.ok(taskService.getTaskDtosByUserId(id));
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		}
	}

	// GET /api/users/{id}/stats
	@GetMapping("/{id}/stats")
	public ResponseEntity<?> getUserStats(@PathVariable Integer id) {
		try {
			User user = userService.findById(id);

			UserStatsResponse stats = new UserStatsResponse();
			stats.setUserId(user.getId());
			stats.setUsername(user.getUsername());
			stats.setTotalProjects(user.getProjects().size());
			stats.setTotalTasks(user.getAllTasks().size());
			stats.setCompletedTasks((int) user.getAllTasks().stream()
					.filter(Task::isCompleted).count());
			stats.setExpiredTasks((int) user.getAllTasks().stream()
					.filter(Task::isExpired).count());
			stats.setGlobalProgress(user.getGlobalProgress());

			return ResponseEntity.ok(stats);
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		}
	}

	// GET /api/users/{id}/profile
	@GetMapping("/{id}/profile")
	public ResponseEntity<?> getUserProfile(@PathVariable Integer id) {
		try {
			User user = userService.findById(id);

			UserProfileResponse profile = new UserProfileResponse();
			profile.setId(user.getId());
			profile.setUsername(user.getUsername());
			profile.setEmail(user.getEmail());
			profile.setProjectCount(user.getProjects().size());
			profile.setTaskCount(user.getAllTasks().size());

			return ResponseEntity.ok(profile);
		} catch (NoSuchElementException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND)
					.body(Map.of("error", e.getMessage()));
		}
	}

	// GET /api/users/search?q=texto
}