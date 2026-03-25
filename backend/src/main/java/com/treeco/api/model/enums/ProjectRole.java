package com.treeco.api.model.enums;

public enum ProjectRole {
    OWNER, // Creador del proyecto, todos los permisos
    ADMIN, // Puede gestionar miembros y configuración
    MEMBER // Puede trabajar en tareas asignadas
}