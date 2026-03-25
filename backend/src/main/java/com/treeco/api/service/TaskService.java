package com.treeco.api.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.treeco.api.dto.user.TaskResponseDto;
import com.treeco.api.model.Project;
import com.treeco.api.model.Task;
import com.treeco.api.model.User;
import com.treeco.api.model.enums.Priority;
import com.treeco.api.model.enums.State;
import com.treeco.api.model.enums.TaskType;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.TaskRepository;
import com.treeco.api.repository.UserRepository;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public TaskService(TaskRepository taskRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    // ── CONSULTAS ─────────────────────────────────────────────────────

    /**
     * Devuelve todas las tareas de un proyecto.
     * 
     * @throws NoSuchElementException si el proyecto no existe
     */
    public List<Task> getTasksByProject(Integer projectId) {
        findProjectOrThrow(projectId);
        return taskRepository.findByProjectId(projectId);
    }

    /**
     * Devuelve todas las tareas de un usuario en formato DTO, incluyendo el nombre
     * del proyecto.
     * 
     * @throws NoSuchElementException si el usuario no existe
     */
    @Transactional(readOnly = true)
    public List<TaskResponseDto> getTaskDtosByUserId(Integer userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + userId));

        return user.getAllTasks().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Busca una tarea por ID dentro de un proyecto.
     * 
     * @throws NoSuchElementException si la tarea o el proyecto no existen
     */
    public Task findById(Integer taskId, Integer projectId) {
        findProjectOrThrow(projectId);
        return taskRepository.findByIdAndProjectId(taskId, projectId)
                .orElseThrow(() -> new NoSuchElementException("Tarea no encontrada con id: " + taskId));
    }

    /**
     * Devuelve tareas de un proyecto ordenadas por fecha límite ascendente.
     */
    public List<Task> getTasksOrderedByDeadline(Integer projectId) {
        findProjectOrThrow(projectId);
        return taskRepository.findByProjectIdOrderByDateDeadlineAsc(projectId);
    }

    /**
     * Filtra tareas de un proyecto por prioridad.
     */
    public List<Task> filterByPriority(Integer projectId, Priority priority) {
        if (priority == null)
            throw new IllegalArgumentException("La prioridad no puede ser null");
        findProjectOrThrow(projectId);
        return taskRepository.findByProjectId(projectId);
    }

    /**
     * Filtra tareas de un proyecto por estado.
     */
    public List<Task> filterByState(Integer projectId, State state) {
        if (state == null)
            throw new IllegalArgumentException("El estado no puede ser null");
        return getTasksByProject(projectId).stream()
                .filter(t -> t.getState() == state)
                .toList();
    }

    // ── CREAR / ACTUALIZAR / ELIMINAR ─────────────────────────────────

    /**
     * Crea una tarea básica en un proyecto.
     * 
     * @throws NoSuchElementException si el proyecto no existe
     */
    @Transactional
    public Task createTask(Integer projectId, String title, String description,
            Priority priority, LocalDateTime dateDeadline) {
        Project project = findProjectOrThrow(projectId);

        Task task = Task.builder(title)
                .description(description)
                .deadline(dateDeadline)
                .build();

        task.setProject(project);
        return taskRepository.save(task);
    }

    /**
     * Crea una tarea de tipo CODE en un proyecto.
     * 
     * @throws NoSuchElementException si el proyecto no existe
     */
    @Transactional
    public Task createCodeTask(Integer projectId, String title, String description,
            Priority priority, LocalDateTime dateDeadline) {
        Project project = findProjectOrThrow(projectId);

        Task task = Task.builder(title)
                .description(description)
                .deadline(dateDeadline)
                .type(TaskType.CODE)
                .build();

        task.setProject(project);
        return taskRepository.save(task);
    }

    /**
     * Actualiza los campos de una tarea existente.
     * 
     * @throws NoSuchElementException si la tarea o el proyecto no existen
     */
    @Transactional
    public Task updateTask(Integer projectId, Integer taskId, String title,
            String description, Priority priority,
            LocalDateTime dateDeadline, Boolean completed) {
        Task task = findById(taskId, projectId);

        if (title != null && !title.isBlank())
            task.setTitle(title);
        if (description != null)
            task.setDescription(description);
        if (priority != null)
        if (dateDeadline != null)
            task.setDateDeadline(dateDeadline);
        if (completed != null)
            task.setCompleted(completed);

        return taskRepository.save(task);
    }

    /**
     * Marca una tarea como completada o pendiente.
     * 
     * @throws NoSuchElementException si la tarea o el proyecto no existen
     */
    @Transactional
    public Task changeState(Integer projectId, Integer taskId, boolean completed) {
        Task task = findById(taskId, projectId);
        task.setCompleted(completed);
        return taskRepository.save(task);
    }

    /**
     * Asigna una tarea a un usuario.
     * 
     * @throws NoSuchElementException si la tarea o el usuario no existen
     */
    @Transactional
    public Task assignTask(Integer projectId, Integer taskId, Integer userId) {
        Task task = findById(taskId, projectId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + userId));

        task.assignTo(user);
        return taskRepository.save(task);
    }

    /**
     * Desasigna la tarea (quita el usuario asignado).
     * 
     * @throws NoSuchElementException si la tarea no existe
     */
    @Transactional
    public Task unassignTask(Integer projectId, Integer taskId) {
        Task task = findById(taskId, projectId);
        task.unassign();
        return taskRepository.save(task);
    }

    /**
     * Elimina una tarea de un proyecto.
     * 
     * @throws NoSuchElementException si la tarea no existe
     */
    @Transactional
    public void deleteTask(Integer projectId, Integer taskId) {
        Task task = findById(taskId, projectId);
        taskRepository.delete(task);
    }

    // ── AUXILIARES ────────────────────────────────────────────────────

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
        } else {
            dto.setProjectId(null);
            dto.setProjectName("Sin proyecto");
        }

        return dto;
    }

    private Project findProjectOrThrow(Integer projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado con id: " + projectId));
    }
}
