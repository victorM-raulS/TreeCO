package com.treeco.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.treeco.api.model.enums.NotificationType;

/**
 * Notificación del sistema para un usuario
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_user_read", columnList = "user_id, read"),
        @Index(name = "idx_created_at", columnList = "created_at")
})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    /**
     * Usuario que recibe la notificación
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Tipo de notificación
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /**
     * ¿Ha sido leída?
     */
    @Column(nullable = false)
    private boolean read = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    /**
     * Fecha de lectura (null si no leída)
     */
    private LocalDateTime readAt;

    /* LINKS OPCIONALES - Para navegar desde la notificación */

    /**
     * ID del proyecto relacionado (si aplica)
     */
    private Long projectId;

    /**
     * ID de la tarea relacionada (si aplica)
     */
    private Long taskId;

    /**
     * ID de la tarea de código relacionada (si aplica)
     */
    private Long codeTaskId;

    /**
     * URL para redirigir al hacer clic
     * Ejemplo: "/projects/5/tasks/12"
     */
    @Column(length = 255)
    private String actionUrl;

    /**
     * Prioridad de la notificación (para ordenar)
     * 1 = Alta, 2 = Media, 3 = Baja
     */
    @Column(nullable = false)
    private Integer priority = 2;

    public Notification() {
        this.createdAt = LocalDateTime.now();
    }

    public Notification(User user, NotificationType type, String title, String message) {
        this.user = user;
        this.type = type;
        this.title = title;
        this.message = message;
        this.createdAt = LocalDateTime.now();
    }

    public void markAsRead() {
        this.read = true;
        this.readAt = LocalDateTime.now();
    }

    public void markAsUnread() {
        this.read = false;
        this.readAt = null;
    }

    public boolean isRecent() {
        return createdAt.isAfter(LocalDateTime.now().minusDays(1));
    }

    public boolean isHighPriority() {
        return priority == 1;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public NotificationType getType() {
        return type;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    public Long getProjectId() {
        return projectId;
    }

    public void setProjectId(Long projectId) {
        this.projectId = projectId;
    }

    public Long getTaskId() {
        return taskId;
    }

    public void setTaskId(Long taskId) {
        this.taskId = taskId;
    }

    public Long getCodeTaskId() {
        return codeTaskId;
    }

    public void setCodeTaskId(Long codeTaskId) {
        this.codeTaskId = codeTaskId;
    }

    public String getActionUrl() {
        return actionUrl;
    }

    public void setActionUrl(String actionUrl) {
        this.actionUrl = actionUrl;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    @Override
    public String toString() {
        return String.format("Notification[id=%d, type=%s, title='%s', read=%s]",
                id, type, title, read);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof Notification))
            return false;
        Notification that = (Notification) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}