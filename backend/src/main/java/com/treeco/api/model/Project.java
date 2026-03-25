package com.treeco.api.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.treeco.api.model.enums.State;
import jakarta.persistence.*;

@Entity
@Table(name = "project")
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDateTime creationDate;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    @JsonBackReference
    private User user;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Task> tasks;

    // Cascade para que al borrar el proyecto se borren sus miembros
    // @JsonIgnore evita el bucle Project → members → ProjectMember → project → ...
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<ProjectMember> members = new ArrayList<>();

    public Project() {
        this.creationDate = LocalDateTime.now();
        this.tasks = new ArrayList<>();
    }

    public Project(String name, String description) {
        setName(name);
        setDescription(description);
        this.creationDate = LocalDateTime.now();
        this.tasks = new ArrayList<>();
    }

    public Project(String name) {
        this(name, null);
    }

    public boolean addTask(Task task) {
        if (task == null)
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        return this.tasks.add(task);
    }

    public void addTask(Task task, int index) {
        if (task == null)
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        this.tasks.add(index, task);
    }

    public boolean removeTask(Task task) {
        if (task == null)
            throw new IllegalArgumentException("El campo 'task' no puede ser null");
        return this.tasks.remove(task);
    }

    public Task removeTask(int index) {
        return this.tasks.remove(index);
    }

    public List<Task> getTasksByState(State state) {
        if (state == null)
            throw new IllegalArgumentException("El campo 'state' no puede estar vacio");
        return this.tasks.stream().filter(t -> t.getState() == state).toList();
    }

    public List<Task> getInProgressTasks() {
        return getTasksByState(State.IN_PROGRESS);
    }

    public List<Task> getCompletedTasks() {
        return getTasksByState(State.COMPLETED);
    }

    public List<Task> getExpiredTasks() {
        return getTasksByState(State.EXPIRED);
    }

    public int getProgress() {
        if (this.tasks.isEmpty())
            return 0;
        return (getCompletedTasks().size() * 100) / this.tasks.size();
    }

    public Integer getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("El campo 'name' no puede ser nulo o vacío");
        }
        this.name = name.trim();
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreationDate() {
        return creationDate;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public List<Task> getTasks() {
        return List.copyOf(this.tasks);
    }

    @Override
    public String toString() {
        if (description == null) {
            return String.format("id: %d%n Name: %s%n Tasks: %s%n", id, name, tasks);
        }
        return String.format("id: %d%n Name: %s%n Description: %s%n Tasks: %s%n", id, name, description, tasks);
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
        Project other = (Project) obj;
        return Objects.equals(id, other.id);
    }
}