package com.treeco.api.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonBackReference;

/**
 * Tarea de tipo CODE — extiende la información de una Task normal
 * con datos específicos de desarrollo de software.
 */

@Entity
@Table(name = "code_task")
public class CodeTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false, unique = true)
    @JsonBackReference
    private Task task;

    @Column(length = 50)
    private String language;

    @Column(length = 255)
    private String repositoryUrl;

    @Column(length = 100)
    private String branchName;

    @Column(length = 255)
    private String pullRequestUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CodeReviewStatus reviewStatus = CodeReviewStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String reviewNotes;

    private Integer estimatedHours;
    private Integer actualHours;

    private LocalDateTime reviewStartedAt;
    private LocalDateTime reviewCompletedAt;

    public enum CodeReviewStatus {
        PENDING,
        IN_REVIEW,
        CHANGES_REQUESTED,
        APPROVED,
        MERGED
    }

    public CodeTask() {
    }

    public CodeTask(Task task) {
        this.task = task;
    }

    public CodeTask(Task task, String language, String repositoryUrl) {
        this.task = task;
        this.language = language;
        this.repositoryUrl = repositoryUrl;
    }
    /* ── GETTERS Y SETTERS ────────────────────────────────────────── */

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Task getTask() {
        return task;
    }

    public void setTask(Task task) {
        this.task = task;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getRepositoryUrl() {
        return repositoryUrl;
    }

    public void setRepositoryUrl(String repositoryUrl) {
        this.repositoryUrl = repositoryUrl;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public String getPullRequestUrl() {
        return pullRequestUrl;
    }

    public void setPullRequestUrl(String pullRequestUrl) {
        this.pullRequestUrl = pullRequestUrl;
    }

    public CodeReviewStatus getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(CodeReviewStatus reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public String getReviewNotes() {
        return reviewNotes;
    }

    public void setReviewNotes(String reviewNotes) {
        this.reviewNotes = reviewNotes;
    }

    public Integer getEstimatedHours() {
        return estimatedHours;
    }

    public void setEstimatedHours(Integer estimatedHours) {
        this.estimatedHours = estimatedHours;
    }

    public Integer getActualHours() {
        return actualHours;
    }

    public void setActualHours(Integer actualHours) {
        this.actualHours = actualHours;
    }

    public LocalDateTime getReviewStartedAt() {
        return reviewStartedAt;
    }

    public void setReviewStartedAt(LocalDateTime reviewStartedAt) {
        this.reviewStartedAt = reviewStartedAt;
    }

    public LocalDateTime getReviewCompletedAt() {
        return reviewCompletedAt;
    }

    public void setReviewCompletedAt(LocalDateTime reviewCompletedAt) {
        this.reviewCompletedAt = reviewCompletedAt;
    }

    /* ── MÉTODOS DE LÓGICA ────────────────────────────────────────── */

    /**
     * Marca el inicio de la revisión de código
     */
    public void startReview() {
        this.reviewStatus = CodeReviewStatus.IN_REVIEW;
        this.reviewStartedAt = LocalDateTime.now();
    }

    /**
     * Aprueba la revisión de código
     * 
     * @param notes Notas opcionales del revisor
     */
    public void approveReview(String notes) {
        this.reviewStatus = CodeReviewStatus.APPROVED;
        this.reviewNotes = notes;
        this.reviewCompletedAt = LocalDateTime.now();
    }

    /**
     * Rechaza la revisión solicitando cambios
     * 
     * @param notes Descripción de los cambios requeridos (obligatorio)
     */
    public void requestChanges(String notes) {
        if (notes == null || notes.trim().isEmpty()) {
            throw new IllegalArgumentException("Se deben especificar los cambios requeridos");
        }
        this.reviewStatus = CodeReviewStatus.CHANGES_REQUESTED;
        this.reviewNotes = notes;
        this.reviewCompletedAt = LocalDateTime.now();
    }

    /**
     * Marca la tarea como fusionada
     */
    public void markAsMerged() {
        this.reviewStatus = CodeReviewStatus.MERGED;
    }

    /**
     * Indica si la tarea está pendiente de revisión
     */
    public boolean isPendingReview() {
        return reviewStatus == CodeReviewStatus.PENDING;
    }

    /**
     * Indica si la tarea ha sido aprobada o fusionada
     */
    public boolean isApproved() {
        return reviewStatus == CodeReviewStatus.APPROVED
                || reviewStatus == CodeReviewStatus.MERGED;
    }

    /**
     * Indica si tiene PR asociado
     */
    public boolean hasPullRequest() {
        return pullRequestUrl != null && !pullRequestUrl.isBlank();
    }

    /**
     * Calcula la desviación entre horas estimadas y reales (puede ser negativa)
     * 
     * @return diferencia en horas, o null si faltan datos
     */
    public Integer getHoursDeviation() {
        if (estimatedHours == null || actualHours == null)
            return null;
        return actualHours - estimatedHours;
    }

    /* ── AUXILIARES ───────────────────────────────────────────────── */

    @Override
    public String toString() {
        return String.format("CodeTask[id=%d, language=%s, reviewStatus=%s, branch=%s]",
                id, language, reviewStatus, branchName);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (!(o instanceof CodeTask))
            return false;
        CodeTask that = (CodeTask) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}