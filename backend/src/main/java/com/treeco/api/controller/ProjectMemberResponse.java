package com.treeco.api.controller;

import com.treeco.api.model.ProjectMember;
import com.treeco.api.model.enums.ProjectRole;

import java.time.LocalDateTime;

/**
 * DTO que expone solo los datos necesarios de ProjectMember al frontend.
 * Al construirse dentro de la transacción activa del controlador,
 * accede a los campos lazy (user, invitedBy) sin LazyInitializationException.
 * Jackson serializa este POJO sin ningún problema porque no tiene proxies Hibernate.
 */
public record ProjectMemberResponse(
        Long id,
        ProjectRole role,
        LocalDateTime joinedAt,
        boolean active,
        UserInfo user,
        UserInfo invitedBy
) {
    public record UserInfo(Integer id, String username, String email) {}

    public static ProjectMemberResponse from(ProjectMember m) {
        UserInfo userInfo = m.getUser() != null
                ? new UserInfo(m.getUser().getId(), m.getUser().getUsername(), m.getUser().getEmail())
                : null;

        UserInfo invitedByInfo = m.getInvitedBy() != null
                ? new UserInfo(m.getInvitedBy().getId(), m.getInvitedBy().getUsername(), m.getInvitedBy().getEmail())
                : null;

        return new ProjectMemberResponse(
                m.getId(),
                m.getRole(),
                m.getJoinedAt(),
                m.isActive(),
                userInfo,
                invitedByInfo
        );
    }
}