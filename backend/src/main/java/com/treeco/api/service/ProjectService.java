package com.treeco.api.service;

import com.treeco.api.model.Project;
import com.treeco.api.model.Task;
import com.treeco.api.model.User;
import com.treeco.api.model.enums.State;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.TaskRepository;
import com.treeco.api.repository.UserRepository;
import com.treeco.api.model.ProjectMember;
import com.treeco.api.model.enums.ProjectRole;
import com.treeco.api.repository.ProjectMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;

    public ProjectService(ProjectRepository projectRepository,
                          UserRepository userRepository,
                          ProjectMemberRepository projectMemberRepository,
                          TaskRepository taskRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.taskRepository = taskRepository;
    }

    // ── CONSULTAS ─────────────────────────────────────────────────────

    public List<Project> getProjects() {
        return projectRepository.findAll();
    }

    /**
     * @throws NoSuchElementException si no existe
     */
    public Project findById(Integer id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado con id: " + id));
    }

    /**
     * @throws NoSuchElementException si el usuario no existe
     */
    public List<Project> getProjectsByUser(Integer userId) {
        if (!userRepository.existsById(userId)) {
            throw new NoSuchElementException("Usuario no encontrado con id: " + userId);
        }
        return projectRepository.findByUserId(userId);
    }

    public int getProgress(Integer projectId) {
        return findById(projectId).getProgress();
    }

    /**
     * Consulta las tareas filtradas por estado directamente en la BD,
     * en vez de cargar todo el proyecto en memoria.
     *
     * @throws NoSuchElementException si el proyecto no existe
     */
    public List<Task> getTasksByState(Integer projectId, State state) {
        if (!projectRepository.existsById(projectId)) {
            throw new NoSuchElementException("Proyecto no encontrado con id: " + projectId);
        }
        return taskRepository.findByProjectId(projectId).stream()
                .filter(t -> t.getState() == state)
                .toList();
    }

    // ── CREAR / ACTUALIZAR / ELIMINAR ─────────────────────────────────

    /**
     * Crea un proyecto y registra al creador como OWNER.
     *
     * @throws NoSuchElementException si el usuario no existe
     */
    @Transactional
    public Project createProject(Integer userId, String name, String description) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + userId));

        Project project = new Project(name, description);
        project.setUser(user);
        projectRepository.save(project);

        // Usa el constructor canónico de ProjectMember — única fuente de verdad
        ProjectMember owner = new ProjectMember(project, user, ProjectRole.OWNER);
        projectMemberRepository.save(owner);

        return project;
    }

    /**
     * @throws NoSuchElementException   si el proyecto no existe
     * @throws IllegalArgumentException si el nombre es nulo o vacío
     */
    @Transactional
    public Project updateProject(Integer projectId, String newName, String newDescription) {
        Project project = findById(projectId);

        if (newName != null && !newName.isBlank()) {
            project.setName(newName);
        }
        if (newDescription != null) {
            project.setDescription(newDescription);
        }

        return projectRepository.save(project);
    }

    /**
     * @throws NoSuchElementException si el proyecto no existe
     */
    @Transactional
    public void deleteProject(Integer projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new NoSuchElementException("Proyecto no encontrado con id: " + projectId);
        }
        projectRepository.deleteById(projectId);
    }
}