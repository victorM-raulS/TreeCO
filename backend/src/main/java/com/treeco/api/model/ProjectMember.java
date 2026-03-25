package com.treeco.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.treeco.api.model.enums.ProjectRole;

/**
 * Representa la pertenencia de un Usuario a un Proyecto con un rol concreto.
 * Tabla puente entre User y Project con datos extra (rol, fecha de unión).
 */
@Entity
@Table(name = "project_member", uniqueConstraints = {
        @UniqueConstraint(name = "uq_project_user", columnNames = { "project_id", "user_id" })
}, indexes = {
        @Index(name = "idx_pm_project", columnList = "project_id"),
        @Index(name = "idx_pm_user", columnList = "user_id")
})
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Proyecto al que pertenece el miembro
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    /**
     * Usuario miembro del proyecto
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Rol del usuario dentro del proyecto
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProjectRole role;

    /**
     * Fecha en que el usuario se unió al proyecto
     */
    @Column(nullable = false)
    private LocalDateTime joinedAt;

    /**
     * Usuario que invitó a este miembro (puede ser null si es el creador)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by")
    private User invitedBy;

    /**
     * Indica si el miembro está activo o ha sido suspendido
     */
    @Column(nullable = false)
    private boolean active = true;

    /* ── CONSTRUCTORES ────────────────────────────────────────────── */

    public ProjectMember() {
        this.joinedAt = LocalDateTime.now();
    }

    public ProjectMember(Project project, User user, ProjectRole role) {
        this.project = project;
        this.user = user;
        this.role = role;
        this.joinedAt = LocalDateTime.now();
    }

    public ProjectMember(Project project, User user, ProjectRole role, User invitedBy) {
        this.project = project;
        this.user = user;
        this.role = role;
        this.invitedBy = invitedBy;
        this.joinedAt = LocalDateTime.now();
    }

    /* ── MÉTODOS DE LÓGICA ────────────────────────────────────────── */

    public boolean isOwner() {
        return role == ProjectRole.OWNER;
    }

    public boolean isAdmin() {
        return role == ProjectRole.ADMIN || role == ProjectRole.OWNER;
    }

    public boolean isMember() {
        return role == ProjectRole.MEMBER;
    }

    /**
     * Cambia el rol del miembro
     * 
     * @throws IllegalArgumentException si se intenta asignar OWNER (solo puede
     *                                  haber uno)
     */
    public void changeRole(ProjectRole newRole) {
        if (newRole == ProjectRole.OWNER) {
            throw new IllegalArgumentException(
                    "No se puede asignar el rol OWNER directamente. Usa transferOwnership()");
        }
        this.role = newRole;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    /* ── GETTERS Y SETTERS ────────────────────────────────────────── */

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public ProjectRole getRole() {
        return role;
    }

    public void setRole(ProjectRole role) {
        this.role = role;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(LocalDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }

    public User getInvitedBy() {
        return invitedBy;
    }

    public void setInvitedBy(User invitedBy) {
        this.invitedBy = invitedBy;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    /* ── AUXILIARES ───────────────────────────────────────────────── */

    @Override
    public String toString() {
        return String.format("ProjectMember[user=%s, project=%d, role=%s, active=%s]",
                user != null ? user.getUsername() : "?",
                project != null ? project.getId() : -1,
                role, active);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof ProjectMember))
            return false;
        ProjectMember that = (ProjectMember) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}