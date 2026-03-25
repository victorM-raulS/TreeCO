package com.treeco.api.model;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.treeco.api.model.enums.EventType;
import com.treeco.api.model.enums.Priority;
import com.treeco.api.model.enums.State;
import com.treeco.api.model.enums.TaskType;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "task")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private final LocalDateTime dateCreation;

    @Column(nullable = false)
    private LocalDateTime dateDeadline;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Priority priority;

    @Column(nullable = false)
    private boolean completed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @JsonBackReference
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "projects", "hashPassword"})
    private User assignedTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private TaskType type = TaskType.NORMAL;

    @OneToOne(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private CodeTask codeTask;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EventType eventType;

    /* CONSTRUCTORES Y BUILDER */

    public static class Builder {

        private String title;

        // Opcionales (valores por defecto)
        private String description = "";
        private LocalDateTime dateDeadline = null;
        private TaskType type = TaskType.NORMAL;
        private User assignedTo = null;
        private EventType eventType = EventType.REMINDER;  // valor por defecto

        public Builder(String title) {
            if (title == null || title.trim().isEmpty()) {
                throw new IllegalArgumentException("El título no puede estar vacío");
            }
            this.title = title.trim();
        }

        public Builder description(String description) {
            this.description = (description == null) ? "" : description.trim();
            return this;
        }

        public Builder deadline(LocalDateTime dateDeadline) {
            this.dateDeadline = dateDeadline;
            return this;
        }

        public Builder type(TaskType type) {
            this.type = (type == null) ? TaskType.NORMAL : type;
            return this;
        }

        public Builder assignedTo(User user) {
            this.assignedTo = user;
            return this;
        }

        public Builder eventType(EventType eventType) {
            this.eventType = eventType;
            return this;
        }

        public Task build() {
            return new Task(this);
        }
    }

    public static Builder builder(String title) {
        return new Builder(title);
    }

    public Task() {
        this.dateCreation = LocalDateTime.now();
        this.completed = false;
        this.type = TaskType.NORMAL;
        this.eventType = EventType.REMINDER;
    }

    private Task(Builder builder) {
        this.title = builder.title;
        this.description = builder.description;
        this.dateCreation = LocalDateTime.now();
        this.dateDeadline = builder.dateDeadline;
        this.type = builder.type;
        this.assignedTo = builder.assignedTo;
        this.eventType = builder.eventType;
        this.completed = false;
    }

    /* GETTERS Y SETTERS */

    public Integer getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public Project getProject() {
        return project;
    }

    public void setTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("El título no puede estar vacío");
        }
        this.title = title.trim();
    }

    public void setDescription(String description) {
        this.description = (description == null) ? "" : description.trim();
    }

    public void setDateDeadline(LocalDateTime dateDeadline) {
        this.dateDeadline = dateDeadline;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }

    /**
     * Obtiene la fecha límite de la tarea
     * 
     * @return la fecha límite, o null si la tarea es un recordatorio sin fecha
     *         límite
     */

    public LocalDateTime getDateDeadline() {
        return dateDeadline;
    }

    public Priority getPriority() {
        // Stored value takes precedence (user set it explicitly)
        if (priority != null) return priority;
        // Legacy: derive from deadline
        if (dateDeadline == null) return Priority.LOW;
        long days = Duration.between(LocalDateTime.now(), dateDeadline).toDays();
        if (days <= 3) return Priority.HIGH;
        if (days <= 7) return Priority.MID;
        return Priority.LOW;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public User getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(User assignedTo) {
        this.assignedTo = assignedTo;
    }

    public TaskType getType() {
        return type;
    }

    public void setType(TaskType type) {
        this.type = type;
    }

    public CodeTask getCodeTask() {
        return codeTask;
    }

    public void setCodeTask(CodeTask codeTask) {
        this.codeTask = codeTask;
        if (codeTask != null) {
            codeTask.setTask(this);
        }
    }

    /* MÉTODOS DE LÓGICA */

    /**
     * Verifica si la tarea está vencida (ha pasado la fecha límite y no está
     * completada)
     * 
     * @return true si está vencida, false en caso contrario
     */

    public boolean isExpired() {
        return !completed
                && dateDeadline != null
                && LocalDateTime.now().isAfter(dateDeadline);
    }

    public State getState() {
        if (completed) {
            return State.COMPLETED;
        } else if (dateDeadline != null && LocalDateTime.now().isAfter(dateDeadline)) {
            return State.EXPIRED;
        } else {
            return State.IN_PROGRESS;
        }
    }

    /**
     * Calcula los días restantes hasta la fecha límite
     * 
     * @return número de días (negativo si ya pasó)
     */

    public long daysLeft() {
        return dateDeadline != null ? java.time.temporal.ChronoUnit.DAYS.between(LocalDateTime.now(), dateDeadline)
                : -1;
    }

    public boolean isCompleted() {
        return this.completed;
    }

    public boolean isCodeTask() {
        return type == TaskType.CODE && codeTask != null;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public boolean isAssigned() {
        return assignedTo != null;
    }

    public boolean isAssignedTo(User user) {
        return assignedTo != null && assignedTo.getId().equals(user.getId());
    }

    public void assignTo(User user) {
        this.assignedTo = user;
    }

    public void unassign() {
        this.assignedTo = null;
    }

    public boolean isDueSoon(int days) {
        if (dateDeadline == null || completed) {
            return false;
        }
        long daysRemaining = daysLeft();
        return daysRemaining >= 0 && daysRemaining <= days;
    }

    /* MÉTODOS AUXILIARES */

    @Override
    public String toString() {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String deadlineStr = (dateDeadline != null) ? dateDeadline.format(formatter) : "Sin fecha";
        String expiredStr = isExpired() ? " [VENCIDA]" : "";
        String assignedStr = isAssigned() ? " (→ " + assignedTo.getUsername() + ")" : " (Sin asignar)";
        String typeStr = (type != TaskType.NORMAL) ? " [" + type + "]" : "";

        return String.format("[ID: %d] %s%s - %s - %s - Límite: %s%s%s",
                id, title, typeStr, getState(), priority, deadlineStr, expiredStr, assignedStr);
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((id == null) ? 0 : id.hashCode());
        return result;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        Task other = (Task) obj;
        if (id == null) {
            if (other.id != null)
                return false;
        } else if (!id.equals(other.id))
            return false;
        return true;
    }
}