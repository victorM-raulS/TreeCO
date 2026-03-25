package com.treeco.api.controller;

import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.TaskRepository;
import com.treeco.api.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import jakarta.persistence.EntityManager;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/dev")
public class DevController {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final EntityManager entityManager;

    public DevController(UserRepository userRepository,
            ProjectRepository projectRepository,
            TaskRepository taskRepository,
            EntityManager entityManager) {
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.entityManager = entityManager;
    }

    @Transactional
    @DeleteMapping("/reset")
    public ResponseEntity<?> resetDatabase() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        userRepository.deleteAll();

        // Reinicia los contadores de ID en PostgreSQL
        // FIXED: la línea 3 estaba duplicando "task_id_seq" en lugar de "users_id_seq"
        entityManager.createNativeQuery("ALTER SEQUENCE task_id_seq RESTART WITH 1").executeUpdate();
        entityManager.createNativeQuery("ALTER SEQUENCE project_id_seq RESTART WITH 1").executeUpdate();
        entityManager.createNativeQuery("ALTER SEQUENCE users_id_seq RESTART WITH 1").executeUpdate();

        return ResponseEntity.ok(Map.of("message", "Base de datos limpiada y contadores reiniciados correctamente"));
    }
}