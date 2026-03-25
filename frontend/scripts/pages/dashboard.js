import { api, requireAuth } from "../core/api.js"
import { getUser } from "../core/session.js"

// ─────────────────────────────────────────────────────────────────────────────
// Arranque del dashboard y carga de tareas pendientes
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  requireAuth()
  loadPendingTasksForDashboard()
})

// ─────────────────────────────────────────────────────────────────────────────
// Obtención y visualización de tareas pendientes
// ─────────────────────────────────────────────────────────────────────────────

async function loadPendingTasksForDashboard() {
  const tasksListContainer = document.getElementById("listTasks")

  try {
    const currentUser = getUser()
    const currentUserId = currentUser?.userId ?? currentUser?.id
    const [tasksResponse] = await Promise.all([api.users.getTasks(currentUserId), api.projects.getByUser(currentUserId)])

    const pendingTasks = (Array.isArray(tasksResponse) ? tasksResponse : []).filter((task) => task.completed === false).sort(compareTasksByDeadlineAscending)

    if (pendingTasks.length === 0) {
      tasksListContainer.innerHTML = buildNoPendingTasksMarkup()
      return
    }

    const maxAgeMilliseconds = 30 * 24 * 60 * 60 * 1000

    pendingTasks.forEach((task) => {
      const remainingTimeMilliseconds = getRemainingTimeMilliseconds(task)
      if (remainingTimeMilliseconds < 0 && Math.abs(remainingTimeMilliseconds) > maxAgeMilliseconds) {
        return
      }
      const taskCardElement = buildDashboardTaskCard(task)
      tasksListContainer.appendChild(taskCardElement)
    })
  } catch (error) {
    console.error("Error cargando tareas:", error)
    if (tasksListContainer) {
      tasksListContainer.innerHTML = `<p>Error al cargar las tareas: ${error.message}</p>`
    }
  }
}

function buildNoPendingTasksMarkup() {
  return `
    <div class="noTask">
      <div class="noTaskIcon">✓</div>
      <p class="noTaskSubtitle">Todo completado</p>
      <h2 class="noTaskTitle">No tienes tareas pendientes</h2>
      <p class="noTaskText">
        Todo está al día. Crea una nueva tarea para empezar a organizar tu trabajo
        y verla aquí ordenada por fecha de finalización.
      </p>
      <div class="noTaskGoTasks">
        <a href="./projects.html" class="noTaskGoTask">Crear tarea</a>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción de cada tarea en el dashboard
// ─────────────────────────────────────────────────────────────────────────────

function buildDashboardTaskCard(task) {
  const taskCardElement = document.createElement("div")
  taskCardElement.classList.add("task", getStateCardClass(task.state))

  const formattedDeadline = formatDeadlineDateTime(task.dateDeadline)
  const formattedState = formatStateForDisplay(task.state)
  const remainingTimeLabel = formatRemainingTimeLabel(task)
  const stateBadgeClass = getStateBadgeClass(task.state)
  const remainingTimeColorClass = getTimeStatusClassFromState(task.state)

  taskCardElement.innerHTML = `    
    <div class="taskHeader">
      <div>
        <h3 class="taskTitle">${task.title ?? "Sin título"}</h3>
        <p class="taskProjectTitle">Proyecto: ${task.projectName ?? "Sin proyecto"}</p>
      </div>
    </div>

    <p class="taskDescription">${task.description ?? "Sin descripción"}</p>

      <div class="taskFooter">
        <span class="taskState ${stateBadgeClass}">${formattedState}</span>
        <span class="taskDeadline">${formattedDeadline}</span>
        <span class="taskRemainingTime ${remainingTimeColorClass}">${remainingTimeLabel}</span>
      </div>
  `

  return taskCardElement
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparación para ordenar por fecha límite
// ─────────────────────────────────────────────────────────────────────────────

function compareTasksByDeadlineAscending(firstTask, secondTask) {
  const firstDeadlineTime = firstTask?.dateDeadline ? new Date(firstTask.dateDeadline).getTime() : Number.MAX_SAFE_INTEGER
  const secondDeadlineTime = secondTask?.dateDeadline ? new Date(secondTask.dateDeadline).getTime() : Number.MAX_SAFE_INTEGER
  return firstDeadlineTime - secondDeadlineTime
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tiempo restante
// ─────────────────────────────────────────────────────────────────────────────

function getRemainingTimeMilliseconds(task) {
  const deadlineTimestamp = task?.dateDeadline ? new Date(task.dateDeadline).getTime() : Number.MAX_SAFE_INTEGER
  return deadlineTimestamp - Date.now()
}

// ─────────────────────────────────────────────────────────────────────────────
// Formateo de prioridad, estado, fechas y tiempo restante
// ─────────────────────────────────────────────────────────────────────────────

function getStateCardClass(state) {
  const normalized = String(state ?? "").toUpperCase()
  if (normalized === "COMPLETED") return "taskCompleted"
  if (normalized === "EXPIRED") return "taskExpired"
  return "taskInProgress"
}

function getStateBadgeClass(state) {
  const normalized = String(state ?? "").toUpperCase()
  if (normalized === "COMPLETED") return "stateCompleted"
  if (normalized === "EXPIRED") return "stateExpired"
  return "stateInProgress"
}

function getTimeStatusClassFromState(state) {
  const normalized = String(state ?? "").toUpperCase()
  if (normalized === "COMPLETED") return "timeStatusCompleted"
  if (normalized === "EXPIRED") return "timeStatusExpired"
  return "timeStatusInProgress"
}

function formatStateForDisplay(state) {
  if (!state) return "Sin estado"
  return state
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function formatDeadlineDateTime(dateString) {
  if (!dateString) return "Sin fecha límite"
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return "Sin fecha límite"
  return date
    .toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replaceAll(",", " ·")
}

function formatRemainingTimeLabel(task) {
  const state = String(task?.state ?? "").toUpperCase()
  const dateString = task?.dateDeadline

  if (!dateString) return "Sin fecha límite"

  const deadlineDate = new Date(dateString)
  if (Number.isNaN(deadlineDate.getTime())) return "Fecha inválida"

  const now = Date.now()
  const differenceMilliseconds = deadlineDate.getTime() - now
  const absoluteDifferenceMilliseconds = Math.abs(differenceMilliseconds)

  const totalHours = Math.floor(absoluteDifferenceMilliseconds / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (state === "EXPIRED") {
    if (days === 0 && hours === 0) return "Vencida hace menos de 1h"
    return `Vencida hace ${days}d ${hours}h`
  }

  if (state === "COMPLETED") return "Completada"

  if (days === 0 && hours === 0) {
    return differenceMilliseconds < 0 ? "Vencida hace menos de 1h" : "Vence en menos de 1h"
  }

  return `Tiempo restante: ${days}d ${hours}h`
}
