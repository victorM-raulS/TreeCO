package com.treeco.api.repository;

import com.treeco.api.model.Project;
import com.treeco.api.model.ProjectMember;
import com.treeco.api.model.enums.ProjectRole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {

    List<ProjectMember> findByProjectIdAndActiveTrue(Integer projectId);

    List<ProjectMember> findByUserIdAndActiveTrue(Integer userId);

    Optional<ProjectMember> findByProjectIdAndUserId(Integer projectId, Integer userId);

    boolean existsByProjectIdAndUserId(Integer projectId, Integer userId);

    List<ProjectMember> findByProjectIdAndRole(Integer projectId, ProjectRole role);

    long countByProjectIdAndActiveTrue(Integer projectId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.project.id = :projectId AND pm.role = 'OWNER'")
    Optional<ProjectMember> findOwnerByProjectId(@Param("projectId") Integer projectId);

    @Query("SELECT COUNT(pm) > 0 FROM ProjectMember pm " +
           "WHERE pm.project.id = :projectId AND pm.user.id = :userId " +
           "AND pm.role = :role AND pm.active = true")
    boolean hasRole(@Param("projectId") Integer projectId,
                    @Param("userId") Integer userId,
                    @Param("role") ProjectRole role);

    /**
     * Devuelve directamente los objetos Project donde el usuario es miembro activo.
     * JPQL resuelve el join y entrega entidades Project reales (no proxies Hibernate),
     * así Jackson las serializa sin ningún problema ni módulo adicional.
     */
    @Query("SELECT pm.project FROM ProjectMember pm " +
           "WHERE pm.user.id = :userId AND pm.active = true")
    List<Project> findProjectsByUserId(@Param("userId") Integer userId);
}