package com.treeco.api.controller;

import com.treeco.api.model.enums.ProjectRole;
import com.treeco.api.service.ProjectMemberService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/projects/{projectId}/members")
public class ProjectMemberController {

    private final ProjectMemberService memberService;

    public ProjectMemberController(ProjectMemberService memberService) {
        this.memberService = memberService;
    }

    public record AddMemberRequest(Integer userId, ProjectRole role, Integer invitedByUserId) {}
    public record ChangeRoleRequest(ProjectRole newRole) {}
    public record TransferOwnershipRequest(Integer currentOwnerId, Integer newOwnerId) {}

    // GET /projects/{projectId}/members
    @GetMapping
    public ResponseEntity<?> getMembers(@PathVariable Integer projectId,
            @RequestParam(required = false) ProjectRole role) {
        try {
            List<ProjectMemberResponse> members = (role != null
                    ? memberService.getMembersByRole(projectId, role)
                    : memberService.getMembersByProject(projectId))
                    .stream()
                    .map(ProjectMemberResponse::from)
                    .toList();
            return ResponseEntity.ok(members);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // GET /projects/{projectId}/members/count
    @GetMapping("/count")
    public ResponseEntity<?> countMembers(@PathVariable Integer projectId) {
        try {
            return ResponseEntity.ok(Map.of(
                    "projectId", projectId,
                    "memberCount", memberService.countMembers(projectId)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // POST /projects/{projectId}/members
    @PostMapping
    public ResponseEntity<?> addMember(@PathVariable Integer projectId,
            @RequestBody AddMemberRequest request) {
        try {
            if (request.userId() == null || request.role() == null || request.invitedByUserId() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Los campos 'userId', 'role' e 'invitedByUserId' son obligatorios"));
            }
            ProjectMemberResponse member = ProjectMemberResponse.from(
                    memberService.addMember(projectId, request.userId(), request.role(), request.invitedByUserId()));
            return ResponseEntity.status(HttpStatus.CREATED).body(member);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // PATCH /projects/{projectId}/members/{userId}/role
    @PatchMapping("/{userId}/role")
    public ResponseEntity<?> changeRole(@PathVariable Integer projectId,
            @PathVariable Integer userId,
            @RequestBody ChangeRoleRequest request) {
        try {
            if (request.newRole() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "El campo 'newRole' es obligatorio"));
            }
            ProjectMemberResponse updated = ProjectMemberResponse.from(
                    memberService.changeRole(projectId, userId, request.newRole()));
            return ResponseEntity.ok(updated);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // PATCH /projects/{projectId}/members/transfer-ownership
    @PatchMapping("/transfer-ownership")
    public ResponseEntity<?> transferOwnership(@PathVariable Integer projectId,
            @RequestBody TransferOwnershipRequest request) {
        try {
            if (request.currentOwnerId() == null || request.newOwnerId() == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Los campos 'currentOwnerId' y 'newOwnerId' son obligatorios"));
            }
            memberService.transferOwnership(projectId, request.currentOwnerId(), request.newOwnerId());
            return ResponseEntity.ok(Map.of("message", "Propiedad transferida correctamente"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // DELETE /projects/{projectId}/members/{userId}
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> removeMember(@PathVariable Integer projectId,
            @PathVariable Integer userId) {
        try {
            memberService.removeMember(projectId, userId);
            return ResponseEntity.ok(Map.of("message", "Miembro eliminado correctamente"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}