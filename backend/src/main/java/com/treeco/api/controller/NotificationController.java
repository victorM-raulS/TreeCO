package com.treeco.api.controller;

import com.treeco.api.model.Notification;
import com.treeco.api.model.enums.NotificationType;
import com.treeco.api.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/users/{userId}/notifications")
public class NotificationController {

    private static final String ERROR = "error";
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    // GET /api/users/{userId}/notifications
    // GET /api/users/{userId}/notifications?unread=true
    // GET /api/users/{userId}/notifications?type=TASK_ASSIGNED
    @GetMapping
    public ResponseEntity<?> getNotifications(@PathVariable Integer userId,
            @RequestParam(required = false) Boolean unread,
            @RequestParam(required = false) NotificationType type) {
        try {
            List<Notification> notifications;

            if (Boolean.TRUE.equals(unread)) {
                notifications = notificationService.getUnread(userId);
            } else if (type != null) {
                notifications = notificationService.getByType(userId, type);
            } else {
                notifications = notificationService.getAll(userId);
            }

            return ResponseEntity.ok(notifications);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(ERROR, e.getMessage()));
        }
    }

    // GET /api/users/{userId}/notifications/count
    @GetMapping("/count")
    public ResponseEntity<?> countUnread(@PathVariable Integer userId) {
        try {
            return ResponseEntity.ok(Map.of(
                    "userId", userId,
                    "unread", notificationService.countUnread(userId)));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(ERROR, e.getMessage()));
        }
    }

    // PATCH /api/users/{userId}/notifications/{id}/read
    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Integer userId,
            @PathVariable Long id) {
        try {
            Notification notification = notificationService.markAsRead(userId, id);
            return ResponseEntity.ok(notification);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(ERROR, e.getMessage()));
        }
    }

    // PATCH /api/users/{userId}/notifications/{id}/unread
    @PatchMapping("/{id}/unread")
    public ResponseEntity<?> markAsUnread(@PathVariable Integer userId,
            @PathVariable Long id) {
        try {
            Notification notification = notificationService.markAsUnread(userId, id);
            return ResponseEntity.ok(notification);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(ERROR, e.getMessage()));
        }
    }

    // PATCH /api/users/{userId}/notifications/read-all
    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable Integer userId) {
        try {
            int updated = notificationService.markAllAsRead(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "Notificaciones marcadas como leídas",
                    "updated", updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(ERROR, e.getMessage()));
        }
    }

    // DELETE /api/users/{userId}/notifications/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer userId,
            @PathVariable Long id) {
        try {
            notificationService.delete(userId, id);
            return ResponseEntity.ok(Map.of("message", "Notificación eliminada correctamente"));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(ERROR, e.getMessage()));
        }
    }

    // DELETE /api/users/{userId}/notifications/read
    @DeleteMapping("/read")
    public ResponseEntity<?> deleteAllRead(@PathVariable Integer userId) {
        try {
            int deleted = notificationService.deleteAllRead(userId);
            return ResponseEntity.ok(Map.of(
                    "message", "Notificaciones leídas eliminadas",
                    "deleted", deleted));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(ERROR, e.getMessage()));
        }
    }
}