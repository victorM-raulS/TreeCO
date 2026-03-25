package com.treeco.api.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.mindrot.jbcrypt.BCrypt;

import com.fasterxml.jackson.annotation.JsonManagedReference;

import jakarta.persistence.*;

/**
 * Clase que representa un usuario del sistema TreeCO
 */

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String hashPassword;

    @Column(nullable = false)
    private boolean emailVerified = false;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Project> projects;

    /* ── Constructores ──────────────────────────── */

    public User() {
        this.projects = new ArrayList<>();
    }

    public User(String username, String email, String password) {
        setUsername(username);
        setEmail(email);
        setPassword(password);
        this.projects = new ArrayList<>();
    }

    /* ── Getters y Setters ──────────────────────── */

    public Integer getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        if (username == null || username.trim().isEmpty())
            throw new IllegalArgumentException("El campo 'username' no puede ser nulo o vacío");
        this.username = username.trim();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        if (email == null || email.trim().isEmpty())
            throw new IllegalArgumentException("El campo 'email' no puede ser nulo o vacío");
        if (!email.matches("^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$"))
            throw new IllegalArgumentException("Formato de 'email' mal introducido");
        this.email = email.trim();
    }

    public String getHashPassword() {
        return hashPassword;
    }

    public void setPassword(String password) {
        if (password == null || password.trim().isEmpty())
            throw new IllegalArgumentException("El campo 'password' no puede ser nulo o vacío");
        if (password.length() < 8)
            throw new IllegalArgumentException("Mínimo 8 caracteres");
        this.hashPassword = BCrypt.hashpw(password, BCrypt.gensalt(6));
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public List<Project> getProjects() {
        return List.copyOf(this.projects);
    }

    /* ── Métodos de lógica ──────────────────────── */

    public boolean checkPassword(String password) {
        if (password == null)
            return false;
        return BCrypt.checkpw(password, this.hashPassword);
    }

    public boolean addProject(Project project) {
        if (project == null)
            throw new IllegalArgumentException("El proyecto no puede ser nulo");
        return this.projects.add(project);
    }

    public boolean removeProject(Project project) {
        return this.projects.remove(project);
    }

    public Project removeProject(int index) {
        return this.projects.remove(index);
    }

    public Project getProjectByid(int projectid) {
        return this.projects.stream()
                .filter(p -> p.getId() == projectid)
                .findFirst().orElse(null);
    }

    public List<Task> getAllTasks() {
        return this.projects.stream()
                .flatMap(p -> p.getTasks().stream())
                .toList();
    }

    public double getGlobalProgress() {
        if (this.projects.isEmpty())
            return 0;
        return this.projects.stream()
                .mapToDouble(Project::getProgress)
                .average().orElse(0);
    }

    /* ── Auxiliares ─────────────────────────────── */

    @Override
    public String toString() {
        return String.format("id: %d | Username: %s | Email: %s | Verified: %s | Projects: %d",
                id, username, email, emailVerified, projects.size());
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null || getClass() != obj.getClass())
            return false;
        User other = (User) obj;
        return Objects.equals(id, other.id);
    }
}