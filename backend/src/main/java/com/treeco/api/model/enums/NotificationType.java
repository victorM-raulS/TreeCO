package com.treeco.api.model.enums;

public enum NotificationType {
    // Tareas
    TASK_ASSIGNED,          // "Te han asignado una tarea"
    TASK_SUBMITTED,         // "Has entregado una tarea" (cambié TASK_SEND por claridad)
    TASK_DUE_SOON,          // "Tu tarea vence en 24h"
    TASK_OVERDUE,           // "Tu tarea está vencida"
    TASK_COMPLETED,         // "Has completado una tarea"
    
    // Proyectos
    PROJECT_INVITE,         // "Te han invitado a un proyecto"
    PROJECT_DELETED,        // "Se ha eliminado un proyecto" (cambié a DELETED)
    PROJECT_REMOVED,        // "Te han expulsado del proyecto" (separé los casos)
    MEMBER_JOINED,          // "Un nuevo miembro se unió"
    MEMBER_LEFT,            // "Un miembro abandonó el proyecto"
    
    // Código
    CODE_SUBMITTED,         // "Código enviado para revisión"
    CODE_REVIEWED,          // "Tu código ha sido revisado"
    CODE_APPROVED,          // "Tu código fue aprobado"
    CODE_REJECTED,          // "Tu código necesita cambios"
    
    // Otros
    COMMENT_ADDED,          // "Nuevo comentario en tu tarea"
    DEADLINE_CHANGED,       // "La fecha límite cambió"
    PROJECT_UPDATE          // "Actualización en proyecto"
}