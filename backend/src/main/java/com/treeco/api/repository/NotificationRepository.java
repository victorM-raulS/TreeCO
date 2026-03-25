package com.treeco.api.repository;

import com.treeco.api.model.Notification;
import com.treeco.api.model.enums.NotificationType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Todas las notificaciones de un usuario ordenadas por fecha desc
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Integer userId);

    /**
     * Solo las no leídas de un usuario
     */
    List<Notification> findByUserIdAndReadFalseOrderByPriorityAscCreatedAtDesc(Integer userId);

    /**
     * Notificaciones de un usuario por tipo
     */
    List<Notification> findByUserIdAndType(Integer userId, NotificationType type);

    /**
     * Cuenta las no leídas de un usuario
     */
    long countByUserIdAndReadFalse(Integer userId);

    /**
     * Marca todas las notificaciones de un usuario como leídas
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true, n.readAt = CURRENT_TIMESTAMP WHERE n.user.id = :userId AND n.read = false")
    int markAllAsReadByUserId(@Param("userId") Integer userId);

    /**
     * Elimina todas las notificaciones leídas de un usuario
     */
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId AND n.read = true")
    int deleteReadByUserId(@Param("userId") Integer userId);

    /**
     * Notificaciones relacionadas con un proyecto concreto
     */
    List<Notification> findByUserIdAndProjectId(Integer userId, Long projectId);

    /**
     * Notificaciones relacionadas con una tarea concreta
     */
    List<Notification> findByUserIdAndTaskId(Integer userId, Long taskId);
}