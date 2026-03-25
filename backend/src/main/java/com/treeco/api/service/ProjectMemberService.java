package com.treeco.api.service;

import com.treeco.api.model.Project;
import com.treeco.api.model.ProjectMember;
import com.treeco.api.model.User;
import com.treeco.api.model.enums.ProjectRole;
import com.treeco.api.repository.ProjectMemberRepository;
import com.treeco.api.repository.ProjectRepository;
import com.treeco.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProjectMemberService {

    private final ProjectMemberRepository memberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectMemberService(ProjectMemberRepository memberRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository) {
        this.memberRepository = memberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    // ── CONSULTAS ─────────────────────────────────────────────────────

    /**
     * Devuelve todos los miembros activos de un proyecto
     */
    public List<ProjectMember> getMembersByProject(Integer projectId) {
        findProjectOrThrow(projectId);
        return memberRepository.findByProjectIdAndActiveTrue(projectId);
    }

    /**
     * Devuelve todos los proyectos en los que participa un usuario
     */
    public List<ProjectMember> getProjectsByUser(Integer userId) {
        findUserOrThrow(userId);
        return memberRepository.findByUserIdAndActiveTrue(userId);
    }

    /**
     * Devuelve los miembros de un proyecto con un rol concreto
     */
    public List<ProjectMember> getMembersByRole(Integer projectId, ProjectRole role) {
        findProjectOrThrow(projectId);
        return memberRepository.findByProjectIdAndRole(projectId, role);
    }

    /**
     * Cuenta los miembros activos de un proyecto
     */
    public long countMembers(Integer projectId) {
        findProjectOrThrow(projectId);
        return memberRepository.countByProjectIdAndActiveTrue(projectId);
    }

    /**
     * Verifica si un usuario tiene un rol concreto en un proyecto
     */
    public boolean hasRole(Integer projectId, Integer userId, ProjectRole role) {
        return memberRepository.hasRole(projectId, userId, role);
    }

    // ── GESTIÓN DE MIEMBROS ───────────────────────────────────────────

    /**
     * Añade el creador del proyecto como OWNER al crear un proyecto.
     * Llamar desde ProjectService al crear un proyecto.
     */
    @Transactional
    public ProjectMember addOwner(Project project, User owner) {
        ProjectMember member = new ProjectMember(project, owner, ProjectRole.OWNER);
        return memberRepository.save(member);
    }

    /**
     * Invita a un usuario al proyecto con un rol dado.
     * 
     * @throws IllegalArgumentException si el usuario ya es miembro
     * @throws IllegalArgumentException si se intenta añadir como OWNER
     */
    @Transactional
    public ProjectMember addMember(Integer projectId, Integer userId,
            ProjectRole role, Integer invitedByUserId) {
        if (role == ProjectRole.OWNER) {
            throw new IllegalArgumentException("No se puede añadir un miembro como OWNER");
        }

        Project project = findProjectOrThrow(projectId);
        User user = findUserOrThrow(userId);
        User invitedBy = findUserOrThrow(invitedByUserId);

        if (memberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalArgumentException("El usuario ya es miembro de este proyecto");
        }

        ProjectMember member = new ProjectMember(project, user, role, invitedBy);
        return memberRepository.save(member);
    }

    /**
     * Cambia el rol de un miembro existente (no puede ser OWNER).
     * 
     * @throws NoSuchElementException   si el miembro no existe
     * @throws IllegalArgumentException si se intenta asignar OWNER
     */
    @Transactional
    public ProjectMember changeRole(Integer projectId, Integer userId, ProjectRole newRole) {
        ProjectMember member = findMemberOrThrow(projectId, userId);
        member.changeRole(newRole); // lanza excepción si newRole == OWNER
        return memberRepository.save(member);
    }

    /**
     * Transfiere la propiedad del proyecto a otro miembro.
     * El antiguo OWNER pasa a ser ADMIN.
     * 
     * @throws NoSuchElementException si alguno de los usuarios no es miembro
     */
    @Transactional
    public void transferOwnership(Integer projectId, Integer currentOwnerId, Integer newOwnerId) {
        ProjectMember currentOwner = findMemberOrThrow(projectId, currentOwnerId);
        ProjectMember newOwner = findMemberOrThrow(projectId, newOwnerId);

        if (!currentOwner.isOwner()) {
            throw new IllegalArgumentException("El usuario especificado no es el OWNER actual");
        }

        currentOwner.setRole(ProjectRole.ADMIN);
        newOwner.setRole(ProjectRole.OWNER);

        memberRepository.save(currentOwner);
        memberRepository.save(newOwner);
    }

    /**
     * Elimina definitivamente a un miembro del proyecto.
     * 
     * @throws IllegalArgumentException si se intenta eliminar al OWNER
     */
    @Transactional
    public void removeMember(Integer projectId, Integer userId) {
        ProjectMember member = findMemberOrThrow(projectId, userId);

        if (member.isOwner()) {
            throw new IllegalArgumentException("No se puede eliminar al OWNER del proyecto");
        }

        memberRepository.delete(member);
    }

    // ── AUXILIARES ────────────────────────────────────────────────────

    private Project findProjectOrThrow(Integer projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new NoSuchElementException("Proyecto no encontrado con id: " + projectId));
    }

    private User findUserOrThrow(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + userId));
    }

    private ProjectMember findMemberOrThrow(Integer projectId, Integer userId) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new NoSuchElementException(
                        "El usuario " + userId + " no es miembro del proyecto " + projectId));
    }
}