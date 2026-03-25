package com.treeco.api.service;

import com.treeco.api.model.Notification;
import com.treeco.api.model.User;
import com.treeco.api.model.enums.NotificationType;
import com.treeco.api.repository.NotificationRepository;
import com.treeco.api.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository,
            UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // ── CONSULTAS ─────────────────────────────────────────────────────

    /**
     * Todas las notificaciones de un usuario, ordenadas por fecha desc
     */
    public List<Notification> getAll(Integer userId) {
        findUserOrThrow(userId);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Solo las no leídas, ordenadas por prioridad y fecha
     */
    public List<Notification> getUnread(Integer userId) {
        findUserOrThrow(userId);
        return notificationRepository.findByUserIdAndReadFalseOrderByPriorityAscCreatedAtDesc(userId);
    }

    /**
     * Cuenta las notificaciones no leídas de un usuario
     */
    public long countUnread(Integer userId) {
        findUserOrThrow(userId);
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    /**
     * Notificaciones de un usuario filtradas por tipo
     */
    public List<Notification> getByType(Integer userId, NotificationType type) {
        findUserOrThrow(userId);
        return notificationRepository.findByUserIdAndType(userId, type);
    }

    // ── CREAR ─────────────────────────────────────────────────────────

    /**
     * Crea una notificación básica para un usuario
     */
    @Transactional
    public Notification create(Integer userId, NotificationType type, String title, String message) {
        User user = findUserOrThrow(userId);
        Notification notification = new Notification(user, type, title, message);
        return notificationRepository.save(notification);
    }

    /**
     * Crea una notificación con link a un proyecto
     */
    @Transactional
    public Notification createForProject(Integer userId, NotificationType type,
            String title, String message,
            Long projectId, String actionUrl) {
        User user = findUserOrThrow(userId);
        Notification notification = new Notification(user, type, title, message);
        notification.setProjectId(projectId);
        notification.setActionUrl(actionUrl);
        return notificationRepository.save(notification);
    }

    /**
     * Crea una notificación con link a una tarea
     */
    @Transactional
    public Notification createForTask(Integer userId, NotificationType type,
            String title, String message,
            Long projectId, Long taskId, String actionUrl) {
        User user = findUserOrThrow(userId);
        Notification notification = new Notification(user, type, title, message);
        notification.setProjectId(projectId);
        notification.setTaskId(taskId);
        notification.setActionUrl(actionUrl);
        return notificationRepository.save(notification);
    }

    /**
     * Crea una notificación de alta prioridad
     */
    @Transactional
    public Notification createHighPriority(Integer userId, NotificationType type,
            String title, String message, String actionUrl) {
        User user = findUserOrThrow(userId);
        Notification notification = new Notification(user, type, title, message);
        notification.setPriority(1);
        notification.setActionUrl(actionUrl);
        return notificationRepository.save(notification);
    }

    // ── MARCAR COMO LEÍDA / NO LEÍDA ──────────────────────────────────

    /**
     * Marca una notificación concreta como leída
     * 
     * @throws NoSuchElementException si no existe o no pertenece al usuario
     */
    @Transactional
    public Notification markAsRead(Integer userId, Long notificationId) {
        Notification notification = findNotificationOrThrow(notificationId, userId);
        notification.markAsRead();
        return notificationRepository.save(notification);
    }

    /**
     * Marca una notificación concreta como no leída
     */
    @Transactional
    public Notification markAsUnread(Integer userId, Long notificationId) {
        Notification notification = findNotificationOrThrow(notificationId, userId);
        notification.markAsUnread();
        return notificationRepository.save(notification);
    }

    /**
     * Marca todas las notificaciones del usuario como leídas
     * 
     * @return número de notificaciones actualizadas
     */
    @Transactional
    public int markAllAsRead(Integer userId) {
        findUserOrThrow(userId);
        return notificationRepository.markAllAsReadByUserId(userId);
    }

    // ── ELIMINAR ──────────────────────────────────────────────────────

    /**
     * Elimina una notificación concreta
     * 
     * @throws NoSuchElementException si no existe o no pertenece al usuario
     */
    @Transactional
    public void delete(Integer userId, Long notificationId) {
        Notification notification = findNotificationOrThrow(notificationId, userId);
        notificationRepository.delete(notification);
    }

    /**
     * Elimina todas las notificaciones leídas del usuario
     * 
     * @return número de notificaciones eliminadas
     */
    @Transactional
    public int deleteAllRead(Integer userId) {
        findUserOrThrow(userId);
        return notificationRepository.deleteReadByUserId(userId);
    }

    // ── AUXILIARES ────────────────────────────────────────────────────

    private User findUserOrThrow(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Usuario no encontrado con id: " + userId));
    }

    private Notification findNotificationOrThrow(Long notificationId, Integer userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NoSuchElementException("Notificación no encontrada con id: " + notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new NoSuchElementException("Notificación no encontrada con id: " + notificationId);
        }
        return notification;
    }
}