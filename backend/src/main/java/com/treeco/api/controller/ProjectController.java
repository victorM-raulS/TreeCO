package com.treeco.api.controller;

import com.treeco.api.model.Project;
import com.treeco.api.model.enums.ProjectRole;
import com.treeco.api.repository.ProjectMemberRepository;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.UserRepository;
import com.treeco.api.service.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ProjectService projectService;

    public ProjectController(ProjectRepository projectRepository,
                             ProjectMemberRepository projectMemberRepository,
                             UserRepository userRepository,
                             ProjectService projectService) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.userRepository = userRepository;
        this.projectService = projectService;
    }

    public record ProjectRequest(String name, String description, Integer userId) {}
    public record ProjectUpdateRequest(String name, String description, Integer requestingUserId) {}

    /**
     * Serializa solo los campos que necesita el frontend.
     * Evita bucles: Project → tasks/members → Project → ...
     */
    private Map<String, Object> toMap(Project p) {
        Map<String, Object> map = new HashMap<>();
        map.put("id",           p.getId());
        map.put("name",         p.getName());
        map.put("description",  p.getDescription());
        map.put("creationDate", p.getCreationDate());
        map.put("progress",     p.getProgress());
        return map;
    }

    @GetMapping
    public ResponseEntity<?> getAllProjects() {
        return ResponseEntity.ok(
            projectRepository.findAll().stream().map(this::toMap).toList()
        );
    }

    @GetMapping(params = "userId")
    public ResponseEntity<?> getProjectsByUser(@RequestParam @NonNull Integer userId) {
        if (userRepository.findById(userId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Usuario no encontrado"));
        }
        List<Map<String, Object>> projects = projectMemberRepository
                .findProjectsByUserId(userId)
                .stream()
                .map(this::toMap)
                .toList();
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@PathVariable @NonNull Integer id) {
        try {
            return ResponseEntity.ok(toMap(findProjectOrThrow(id)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody ProjectRequest request) {
        try {
            if (request.name() == null || request.userId() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Los campos 'name' y 'userId' son obligatorios"));
            }
            Project project = projectService.createProject(request.userId(), request.name(), request.description());
            return ResponseEntity.status(HttpStatus.CREATED).body(toMap(project));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateProject(@PathVariable @NonNull Integer id,
            @RequestBody ProjectUpdateRequest request) {
        try {
            Project project = findProjectOrThrow(id);

            if (request.requestingUserId() != null) {
                boolean isAdmin = projectMemberRepository.hasRole(id, request.requestingUserId(), ProjectRole.OWNER)
                               || projectMemberRepository.hasRole(id, request.requestingUserId(), ProjectRole.ADMIN);
                if (!isAdmin) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Solo el OWNER o ADMIN pueden modificar el proyecto"));
                }
            }

            if (request.name() != null) project.setName(request.name());
            if (request.description() != null) project.setDescription(request.description());
            projectRepository.save(project);
            return ResponseEntity.ok(toMap(project));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable @NonNull Integer id,
            @RequestParam(required = false) Integer requestingUserId) {
        try {
            findProjectOrThrow(id);
            if (requestingUserId != null) {
                boolean isOwner = projectMemberRepository.hasRole(id, requestingUserId, ProjectRole.OWNER);
                if (!isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Solo el OWNER puede eliminar el proyecto"));
                }
            }
            projectRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Proyecto eliminado correctamente"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/progress")
    public ResponseEntity<?> getProgress(@PathVariable @NonNull Integer id) {
        try {
            Project project = findProjectOrThrow(id);
            return ResponseEntity.ok(Map.of("projectId", id, "progress", project.getProgress()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    private Project findProjectOrThrow(@NonNull Integer id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado"));
    }
}