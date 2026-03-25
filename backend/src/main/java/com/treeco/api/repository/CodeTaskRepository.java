package com.treeco.api.repository;

import com.treeco.api.model.CodeTask;
import com.treeco.api.model.CodeTask.CodeReviewStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CodeTaskRepository extends JpaRepository<CodeTask, Long> {

    /**
     * Busca la CodeTask asociada a una Task concreta
     */
    Optional<CodeTask> findByTaskId(Integer taskId);

    /**
     * Busca todas las CodeTasks de un proyecto concreto
     */
    @Query("SELECT ct FROM CodeTask ct WHERE ct.task.project.id = :projectId")
    List<CodeTask> findByProjectId(@Param("projectId") Integer projectId);

    /**
     * Busca CodeTasks por estado de revisión
     */
    List<CodeTask> findByReviewStatus(CodeReviewStatus reviewStatus);

    /**
     * Busca CodeTasks pendientes de revisión de un proyecto
     */
    @Query("SELECT ct FROM CodeTask ct WHERE ct.task.project.id = :projectId AND ct.reviewStatus = :status")
    List<CodeTask> findByProjectIdAndReviewStatus(
            @Param("projectId") Integer projectId,
            @Param("status") CodeReviewStatus status);

    /**
     * Busca CodeTasks por lenguaje de programación
     */
    List<CodeTask> findByLanguageIgnoreCase(String language);

    /**
     * Cuenta cuántas CodeTasks tiene un proyecto por estado
     */
    @Query("SELECT COUNT(ct) FROM CodeTask ct WHERE ct.task.project.id = :projectId AND ct.reviewStatus = :status")
    long countByProjectIdAndReviewStatus(
            @Param("projectId") Integer projectId,
            @Param("status") CodeReviewStatus status);

    /**
     * Comprueba si ya existe una CodeTask para una Task dada
     */
    boolean existsByTaskId(Integer taskId);
}