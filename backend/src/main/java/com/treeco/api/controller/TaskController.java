package com.treeco.api.controller;

import com.treeco.api.dto.user.TaskResponseDto;
import com.treeco.api.model.CodeTask;
import com.treeco.api.model.Project;
import com.treeco.api.model.Task;
import com.treeco.api.model.enums.Priority;
import com.treeco.api.model.enums.State;
import com.treeco.api.model.enums.TaskType;
import com.treeco.api.repository.CodeTaskRepository;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.TaskRepository;
import com.treeco.api.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/projects/{projectId}/tasks")
public class TaskController {

    private final TaskRepository     taskRepository;
    private final ProjectRepository  projectRepository;
    private final UserRepository     userRepository;
    private final CodeTaskRepository codeTaskRepository;

    public TaskController(TaskRepository taskRepository,
                          ProjectRepository projectRepository,
                          UserRepository userRepository,
                          CodeTaskRepository codeTaskRepository) {
        this.taskRepository     = taskRepository;
        this.projectRepository  = projectRepository;
        this.userRepository     = userRepository;
        this.codeTaskRepository = codeTaskRepository;
    }

    // ── Request records ───────────────────────────────────────────────

    public record TaskRequest(
            String title,
            String description,
            Priority priority,
            LocalDateTime dateDeadline,
            Integer assignedToId,
            String type,
            String language,
            String repositoryUrl,
            String branchName
    ) {}

    public record TaskUpdateRequest(
            String title,
            String description,
            Priority priority,
            LocalDateTime dateDeadline,
            Boolean completed,
            Integer assignedToId,  // -1 = explicit unassign
            String type,
            String language,
            String repositoryUrl,
            String branchName
    ) {}

    // ── GET all ───────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<?> getTasks(@PathVariable @NonNull Integer projectId,
            @RequestParam(required = false) State state,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false, defaultValue = "false") boolean orderByDate) {
        try {
            findProjectOrThrow(projectId);

            List<Task> tasks = orderByDate
                    ? taskRepository.findByProjectIdOrderByDateDeadlineAsc(projectId)
                    : taskRepository.findByProjectId(projectId);

            if (state != null)
                tasks = tasks.stream().filter(t -> t.getState() == state).toList();

            return ResponseEntity.ok(tasks.stream().map(this::toDto).toList());
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // ── GET one ───────────────────────────────────────────────────────

    @GetMapping("/{taskId}")
    public ResponseEntity<?> getTask(@PathVariable @NonNull Integer projectId,
            @PathVariable @NonNull Integer taskId) {
        try {
            findProjectOrThrow(projectId);
            return ResponseEntity.ok(toDto(findTaskOrThrow(taskId, projectId)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // ── POST create ───────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<?> createTask(@PathVariable @NonNull Integer projectId,
            @RequestBody TaskRequest req) {
        try {
            if (req.title() == null || req.title().isBlank())
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "El campo 'title' es obligatorio"));

            Project project = findProjectOrThrow(projectId);

            Task task = Task.builder(req.title())
                    .description(req.description())
                    .deadline(req.dateDeadline())
                    .build();

            if (req.priority() != null) task.setPriority(req.priority());

            if (req.type() != null) {
                try { task.setType(TaskType.valueOf(req.type())); }
                catch (IllegalArgumentException ignored) {}
            }

            if (req.assignedToId() != null && req.assignedToId() > 0)
                userRepository.findById(req.assignedToId()).ifPresent(task::setAssignedTo);

            task.setProject(project);
            taskRepository.save(task);

            if (task.getType() == TaskType.CODE) {
                CodeTask ct = new CodeTask(task);
                if (req.language()      != null) ct.setLanguage(req.language());
                if (req.repositoryUrl() != null) ct.setRepositoryUrl(req.repositoryUrl());
                if (req.branchName()    != null) ct.setBranchName(req.branchName());
                codeTaskRepository.save(ct);
                task.setCodeTask(ct);
                taskRepository.save(task);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(toDto(task));

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    // ── PATCH update ─────────────────────────────────────────────────

    @PatchMapping("/{taskId}")
    public ResponseEntity<?> updateTask(@PathVariable @NonNull Integer projectId,
            @PathVariable @NonNull Integer taskId,
            @RequestBody TaskUpdateRequest req) {
        try {
            findProjectOrThrow(projectId);
            Task task = findTaskOrThrow(taskId, projectId);

            if (req.title()        != null) task.setTitle(req.title());
            if (req.description()  != null) task.setDescription(req.description());
            if (req.priority()     != null) task.setPriority(req.priority());
            if (req.dateDeadline() != null) task.setDateDeadline(req.dateDeadline());
            if (req.completed()    != null) task.setCompleted(req.completed());

            if (req.type() != null) {
                try { task.setType(TaskType.valueOf(req.type())); }
                catch (IllegalArgumentException ignored) {}
            }

            if (req.assignedToId() != null) {
                if (req.assignedToId() == -1) task.setAssignedTo(null);
                else userRepository.findById(req.assignedToId()).ifPresent(task::setAssignedTo);
            }

            taskRepository.save(task);

            if (task.getType() == TaskType.CODE) {
                CodeTask ct = task.getCodeTask() != null ? task.getCodeTask() : new CodeTask(task);
                if (req.language()      != null) ct.setLanguage(req.language());
                if (req.repositoryUrl() != null) ct.setRepositoryUrl(req.repositoryUrl());
                if (req.branchName()    != null) ct.setBranchName(req.branchName());
                codeTaskRepository.save(ct);
                task.setCodeTask(ct);
                taskRepository.save(task);
            }

            return ResponseEntity.ok(toDto(task));

        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    // ── DELETE ────────────────────────────────────────────────────────

    @DeleteMapping("/{taskId}")
    public ResponseEntity<?> deleteTask(@PathVariable @NonNull Integer projectId,
            @PathVariable @NonNull Integer taskId) {
        try {
            findProjectOrThrow(projectId);
            taskRepository.delete(findTaskOrThrow(taskId, projectId));
            return ResponseEntity.ok(Map.of("message", "Tarea eliminada correctamente"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // ── DTO mapper ────────────────────────────────────────────────────

    /**
     * Convierte Task a TaskResponseDto eliminando todas las referencias circulares.
     * Task → Project (ignorado), Task → CodeTask → Task (cortado con DTO plano).
     */
    private TaskResponseDto toDto(Task task) {
        TaskResponseDto dto = new TaskResponseDto();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        dto.setDateCreation(task.getDateCreation());
        dto.setDateDeadline(task.getDateDeadline());
        dto.setPriority(task.getPriority() != null ? task.getPriority().name() : null);
        dto.setCompleted(task.isCompleted());
        dto.setState(task.getState() != null ? task.getState().name() : null);
        dto.setType(task.getType() != null ? task.getType().name() : null);

        if (task.getProject() != null) {
            dto.setProjectId(task.getProject().getId());
            dto.setProjectName(task.getProject().getName());
        }

        if (task.getAssignedTo() != null) {
            var u = task.getAssignedTo();
            dto.setAssignedTo(new TaskResponseDto.AssignedToDto(u.getId(), u.getUsername(), u.getEmail()));
        }

        if (task.getCodeTask() != null) {
            var ct = task.getCodeTask();
            TaskResponseDto.CodeTaskDto ctDto = new TaskResponseDto.CodeTaskDto();
            ctDto.setId(ct.getId());
            ctDto.setLanguage(ct.getLanguage());
            ctDto.setRepositoryUrl(ct.getRepositoryUrl());
            ctDto.setBranchName(ct.getBranchName());
            ctDto.setPullRequestUrl(ct.getPullRequestUrl());
            ctDto.setReviewStatus(ct.getReviewStatus() != null ? ct.getReviewStatus().name() : null);
            ctDto.setReviewNotes(ct.getReviewNotes());
            ctDto.setEstimatedHours(ct.getEstimatedHours());
            ctDto.setActualHours(ct.getActualHours());
            dto.setCodeTask(ctDto);
        }

        return dto;
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private Project findProjectOrThrow(@NonNull Integer id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado"));
    }

    private Task findTaskOrThrow(@NonNull Integer taskId, @NonNull Integer projectId) {
        return taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new NoSuchElementException("Tarea no encontrada"));
    }
}