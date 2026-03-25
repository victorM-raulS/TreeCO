import { api, requireAuth } from "../core/api.js"
import { getUser } from "../core/session.js"

const CATEGORY_SECTION_TITLES = {
  all: "Todas las tareas",
  in_progress: "En progreso",
  completed: "Completadas",
  expired: "Vencidas",
  high: "Alta prioridad",
  mid: "Media prioridad",
  low: "Baja prioridad",
  with_deadline: "Con fecha límite",
  without_deadline: "Sin fecha",
}

let cachedTasksList = []
let projectsList = []
let projectIdToNameMap = {}
let editingTaskId = null

const taskFilters = {
  search: "",
  state: "all",
  priority: "all",
  project: "all",
  sort: "deadline",
  category: "all",
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth()
  setupTaskPageEventListeners()
  loadTasksFromApi()
})

function setupTaskPageEventListeners() {
  document.getElementById("searchTask")?.addEventListener("input", (event) => {
    taskFilters.search = String(event.target.value ?? "")
      .toLowerCase()
      .trim()
    applyTaskFilters()
  })

  document.getElementById("filterState")?.addEventListener("change", (event) => {
    taskFilters.state = event.target.value

    const categoryByStateValue = {
      all: "all",
      in_progress: "in_progress",
      completed: "completed",
      expired: "expired",
    }

    taskFilters.category = categoryByStateValue[taskFilters.state] ?? "all"
    updateActiveSidebarCategoryButton()
    updateTasksSectionTitle()
    applyTaskFilters()
  })

  document.getElementById("filterPriority")?.addEventListener("change", (event) => {
    taskFilters.priority = event.target.value
    applyTaskFilters()
  })

  document.getElementById("filterProject")?.addEventListener("change", (event) => {
    taskFilters.project = event.target.value
    applyTaskFilters()
  })

  document.getElementById("sortTasks")?.addEventListener("change", (event) => {
    taskFilters.sort = event.target.value
    applyTaskFilters()
  })

  document.querySelectorAll(".tasksSidebarLink").forEach((button) => {
    button.addEventListener("click", () => {
      applySidebarCategory(button.dataset.category ?? "all")
    })
  })

  document.getElementById("newTaskButton")?.addEventListener("click", () => {
    alert("La creación ya no usa modal en esta versión. Hazla desde la vista/proyecto donde la tengas implementada.")
  })

  document.addEventListener("click", async (event) => {
    const editButton = event.target.closest(".editTask")
    const cancelEditButton = event.target.closest(".cancelEditTask")
    const saveEditButton = event.target.closest(".saveEditTask")
    const toggleButton = event.target.closest(".toggleTaskState")
    const deleteButton = event.target.closest(".deleteTask")

    if (editButton) {
      startInlineEdit(editButton.dataset.id)
      return
    }

    if (cancelEditButton) {
      cancelInlineEdit()
      return
    }

    if (saveEditButton) {
      await saveInlineEdit(saveEditButton.dataset.id)
      return
    }

    if (toggleButton) {
      await toggleTaskCompletion(toggleButton.dataset.id)
      return
    }

    if (deleteButton) {
      await deleteTask(deleteButton.dataset.id)
    }
  })
}

async function loadTasksFromApi() {
  const tasksContainer = document.getElementById("tasksContainer")
  const tasksCount = document.getElementById("tasksCount")

  if (!tasksContainer) return

  tasksContainer.innerHTML = ""
  if (tasksCount) tasksCount.textContent = "0 tareas"

  try {
    const user = getUser()
    const userId = user?.userId ?? user?.id

    if (!userId) {
      throw new Error("No se pudo identificar al usuario")
    }

    const [tasksResult, projectsResult] = await Promise.allSettled([api.users.getTasks(userId), api.projects.getByUser(userId)])

    cachedTasksList = tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value) ? tasksResult.value : []

    projectsList = projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value) ? projectsResult.value : []

    projectIdToNameMap = Object.fromEntries(projectsList.filter((project) => project?.id != null).map((project) => [String(project.id), project.name ?? "Proyecto sin nombre"]))

    populateProjectFilterOptions(projectsList)
    updateActiveSidebarCategoryButton()
    updateTasksSectionTitle()
    applyTaskFilters()
  } catch (error) {
    console.error("Error cargando tareas:", error)
    tasksContainer.innerHTML = `<p class="errorState">Error al cargar las tareas: ${error?.message ?? "Error desconocido"}</p>`
  }
}

function populateProjectFilterOptions(projects) {
  const filterSelect = document.getElementById("filterProject")
  if (!filterSelect) return

  filterSelect.innerHTML = `<option value="all">Proyecto</option>`

  projects.forEach((project) => {
    if (project?.id == null) return

    const option = document.createElement("option")
    option.value = String(project.id)
    option.textContent = project.name ?? "Proyecto sin nombre"
    filterSelect.appendChild(option)
  })
}

function applySidebarCategory(selectedCategory) {
  taskFilters.category = selectedCategory
  taskFilters.state = "all"
  taskFilters.priority = "all"

  if (["in_progress", "completed", "expired"].includes(selectedCategory)) {
    taskFilters.state = selectedCategory
  } else if (["high", "mid", "low"].includes(selectedCategory)) {
    taskFilters.priority = selectedCategory
  }

  setSelectValueById("filterState", taskFilters.state)
  setSelectValueById("filterPriority", taskFilters.priority)

  updateActiveSidebarCategoryButton()
  updateTasksSectionTitle()
  applyTaskFilters()
}

function setSelectValueById(selectId, value) {
  const select = document.getElementById(selectId)
  if (select) select.value = value
}

function updateActiveSidebarCategoryButton() {
  document.querySelectorAll(".tasksSidebarLink").forEach((button) => {
    button.classList.toggle("tasksSidebarLinkActive", button.dataset.category === taskFilters.category)
  })
}

function updateTasksSectionTitle() {
  const title = document.getElementById("tasksSectionTitle")
  if (title) title.textContent = CATEGORY_SECTION_TITLES[taskFilters.category] ?? "Tareas"
}

function applyTaskFilters() {
  let filteredTasks = [...cachedTasksList]

  if (taskFilters.search) {
    filteredTasks = filteredTasks.filter((task) => {
      const title = String(task?.title ?? "").toLowerCase()
      const description = String(task?.description ?? "").toLowerCase()
      return title.includes(taskFilters.search) || description.includes(taskFilters.search)
    })
  }

  if (taskFilters.category === "with_deadline") {
    filteredTasks = filteredTasks.filter((task) => !!task?.dateDeadline)
  } else if (taskFilters.category === "without_deadline") {
    filteredTasks = filteredTasks.filter((task) => !task?.dateDeadline)
  }

  if (taskFilters.state !== "all") {
    filteredTasks = filteredTasks.filter((task) => normalizeTaskState(task?.state, task?.completed, task?.dateDeadline) === taskFilters.state)
  }

  if (taskFilters.priority !== "all") {
    filteredTasks = filteredTasks.filter((task) => normalizeTaskPriority(task?.priority) === taskFilters.priority)
  }

  if (taskFilters.project !== "all") {
    filteredTasks = filteredTasks.filter((task) => String(getTaskProjectId(task) ?? "") === String(taskFilters.project))
  }

  filteredTasks.sort((a, b) => compareTasksForSort(a, b, taskFilters.sort))

  renderTasksStatistics(filteredTasks)
  renderFilteredTasksList(filteredTasks)
}

function renderTasksStatistics(tasks) {
  const stats = {
    statInProgress: tasks.filter((task) => normalizeTaskState(task?.state, task?.completed, task?.dateDeadline) === "in_progress").length,
    statExpired: tasks.filter((task) => normalizeTaskState(task?.state, task?.completed, task?.dateDeadline) === "expired").length,
    statCompleted: tasks.filter((task) => normalizeTaskState(task?.state, task?.completed, task?.dateDeadline) === "completed").length,
    statHigh: tasks.filter((task) => normalizeTaskPriority(task?.priority) === "high").length,
  }

  Object.entries(stats).forEach(([id, value]) => {
    const element = document.getElementById(id)
    if (element) element.textContent = String(value)
  })
}

function renderFilteredTasksList(tasks) {
  const tasksContainer = document.getElementById("tasksContainer")
  const tasksCount = document.getElementById("tasksCount")

  if (!tasksContainer) return

  tasksContainer.innerHTML = ""

  if (tasksCount) {
    tasksCount.textContent = `${tasks.length} ${tasks.length === 1 ? "tarea" : "tareas"}`
  }

  if (!tasks.length) {
    tasksContainer.innerHTML = `
      <div class="noTask">
        <div class="noTaskIcon">✓</div>
        <p class="noTaskSubtitle">Sin tareas</p>
        <h2 class="noTaskTitle">No hay tareas para mostrar</h2>
        <p class="noTaskText">Cambia los filtros o revisa otro proyecto para ver más resultados.</p>
        <div class="noTaskGoTasks">
          <a href="projects.html" class="noTaskGoTask">Crear tarea</a>
        </div>
      </div>
    `
    return
  }

  tasks.forEach((task) => {
    tasksContainer.appendChild(buildTaskCardElement(task))
  })
}

function buildTaskCardElement(task) {
  if (String(editingTaskId) === String(task?.id)) {
    return buildEditableTaskCardElement(task)
  }

  const article = document.createElement("article")
  const normalizedState = normalizeTaskState(task?.state, task?.completed, task?.dateDeadline)
  const projectName = resolveTaskProjectName(task)
  const formattedDeadline = formatTaskDeadline(task?.dateDeadline)
  const relativeDeadline = getRelativeDeadlineLabel(task?.dateDeadline, normalizedState)

  article.className = `taskCard ${getTaskCardStateClass(normalizedState)}`

  article.innerHTML = `
    <div class="taskCardTop">
      <div>
        <h3 class="taskCardTitle">${task?.title ?? "Sin título"}</h3>
        <p class="taskCardProject">Proyecto: ${projectName}</p>
      </div>
    </div>

    <p class="taskCardDescription">${task?.description?.trim() || "Sin descripción"}</p>

    <div class="taskCardBottom">
      <div class="taskCardMeta">
        <span class="taskCardState ${getTaskStateBadgeClass(normalizedState)}">${getTaskStateLabel(normalizedState)}</span>
        <span class="taskCardDeadline">${formattedDeadline}</span>
        <span class="taskCardTimeStatus ${getTaskTimeStatusClass(normalizedState)}">${relativeDeadline}</span>
      </div>

      <div class="taskCardActions">
        <button type="button" class="editTask" data-id="${task?.id ?? ""}">Editar</button>
        <button type="button" class="toggleTaskState taskActionComplete" data-id="${task?.id ?? ""}">
          ${normalizedState === "completed" ? "Descompletar" : "Completar"}
        </button>
        <button type="button" class="deleteTask taskActionDelete" data-id="${task?.id ?? ""}">Eliminar</button>
      </div>
    </div>
  `

  return article
}

function buildEditableTaskCardElement(task) {
  const article = document.createElement("article")
  article.className = `taskCard taskCardEditing ${getTaskCardStateClass(normalizeTaskState(task?.state, task?.completed, task?.dateDeadline))}`

  article.innerHTML = `
    <div class="taskInlineForm">
      <div class="taskInlineGrid">
        <div class="taskInlineFieldWrap">
          <label class="taskInlineLabel" for="edit-title-${task.id}">Título</label>
          <input
            id="edit-title-${task.id}"
            class="taskInlineField"
            type="text"
            value="${task?.title ?? ""}"
            maxlength="255"
          />
        </div>

        <div class="taskInlineFieldWrap">
          <label class="taskInlineLabel" for="edit-description-${task.id}">Descripción</label>
          <textarea
            id="edit-description-${task.id}"
            class="taskInlineField"
            rows="4"
          >${task?.description ?? ""}</textarea>
        </div>

        <div class="taskInlineFieldWrap">
          <label class="taskInlineLabel" for="edit-deadline-${task.id}">Fecha límite</label>
          <input
            id="edit-deadline-${task.id}"
            class="taskInlineField"
            type="datetime-local"
            value="${formatForDateTimeLocal(task?.dateDeadline)}"
          />
        </div>
      </div>

      <div class="taskInlineActions">
        <button type="button" class="saveEditTask taskInlineSave" data-id="${task?.id ?? ""}">Guardar</button>
        <button type="button" class="cancelEditTask taskInlineCancel">Cancelar</button>
      </div>
    </div>
  `

  return article
}

function startInlineEdit(taskId) {
  editingTaskId = taskId
  applyTaskFilters()
}

function cancelInlineEdit() {
  editingTaskId = null
  applyTaskFilters()
}

async function saveInlineEdit(taskId) {
  const task = findTaskById(taskId)
  if (!task) return

  const projectId = getTaskProjectId(task)
  if (!projectId) {
    alert("No se encontró el proyecto de la tarea")
    return
  }

  const title = String(document.getElementById(`edit-title-${taskId}`)?.value ?? "").trim()
  const description = String(document.getElementById(`edit-description-${taskId}`)?.value ?? "").trim()
  const deadlineRaw = String(document.getElementById(`edit-deadline-${taskId}`)?.value ?? "").trim()

  if (!title) {
    alert("El título es obligatorio")
    return
  }

  try {
    await api.tasks.update(projectId, taskId, {
      title,
      description,
      dateDeadline: deadlineRaw ? new Date(deadlineRaw).toISOString() : null,
      completed: Boolean(task.completed),
    })

    editingTaskId = null
    await loadTasksFromApi()
  } catch (error) {
    console.error("Error editando tarea:", error)
    alert(error?.message ?? "No se pudo editar la tarea")
  }
}

async function toggleTaskCompletion(taskId) {
  const task = findTaskById(taskId)
  if (!task) return

  const projectId = getTaskProjectId(task)
  if (!projectId) {
    alert("No se encontró el proyecto de la tarea")
    return
  }

  const isCompleted = normalizeTaskState(task?.state, task?.completed, task?.dateDeadline) === "completed"

  try {
    await api.tasks.update(projectId, taskId, {
      title: task?.title ?? "",
      description: task?.description ?? "",
      dateDeadline: task?.dateDeadline ?? null,
      completed: !isCompleted,
    })

    cachedTasksList = cachedTasksList.map((taskItem) => {
      if (String(taskItem?.id) !== String(taskId)) return taskItem

      return {
        ...taskItem,
        completed: !isCompleted,
        state: isCompleted ? "in_progress" : "completed",
      }
    })

    if (String(editingTaskId) === String(taskId)) {
      editingTaskId = null
    }

    applyTaskFilters()
  } catch (error) {
    console.error("Error cambiando estado de tarea:", error)
    alert(error?.message ?? "No se pudo actualizar el estado de la tarea")
  }
}

async function deleteTask(taskId) {
  const task = findTaskById(taskId)
  if (!task) return

  const confirmed = globalThis.confirm(`¿Eliminar la tarea "${task.title ?? "Sin título"}"?`)
  if (!confirmed) return

  const projectId = getTaskProjectId(task)
  if (!projectId) {
    alert("No se encontró el proyecto de la tarea")
    return
  }

  try {
    await api.tasks.delete(projectId, taskId)

    cachedTasksList = cachedTasksList.filter((taskItem) => String(taskItem?.id) !== String(taskId))

    if (String(editingTaskId) === String(taskId)) {
      editingTaskId = null
    }

    applyTaskFilters()
  } catch (error) {
    console.error("Error eliminando tarea:", error)
    alert(error?.message ?? "No se pudo eliminar la tarea")
  }
}

function findTaskById(taskId) {
  return cachedTasksList.find((task) => String(task?.id) === String(taskId)) ?? null
}

function resolveTaskProjectName(task) {
  if (task?.project?.name) return task.project.name
  if (task?.projectName) return task.projectName

  const projectId = getTaskProjectId(task)
  if (projectId != null && projectIdToNameMap[String(projectId)]) {
    return projectIdToNameMap[String(projectId)]
  }

  return "Sin proyecto"
}

function getTaskProjectId(task) {
  return task?.projectId ?? task?.project?.id ?? null
}

function normalizeTaskPriority(priority) {
  const normalized = String(priority ?? "").toLowerCase()

  if (normalized === "high") return "high"
  if (normalized === "mid" || normalized === "medium") return "mid"
  if (normalized === "low") return "low"

  return "unknown"
}

function normalizeTaskState(state, completed, deadline) {
  if (completed === true) return "completed"

  const normalized = String(state ?? "").toLowerCase()

  if (normalized === "completed") return "completed"
  if (normalized === "expired") return "expired"
  if (normalized === "in_progress" || normalized === "pending" || normalized === "todo") return "in_progress"

  if (deadline) {
    const deadlineTime = new Date(deadline).getTime()
    if (!Number.isNaN(deadlineTime) && deadlineTime < Date.now()) {
      return "expired"
    }
  }

  return "in_progress"
}

function compareTasksForSort(firstTask, secondTask, sortMode) {
  const priorityWeight = (value) => {
    return (
      {
        high: 0,
        mid: 1,
        low: 2,
      }[normalizeTaskPriority(value)] ?? 3
    )
  }

  const toTimestamp = (value) => {
    if (!value) return Number.MAX_SAFE_INTEGER
    const timestamp = new Date(value).getTime()
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
  }

  if (sortMode === "priority") {
    return priorityWeight(firstTask?.priority) - priorityWeight(secondTask?.priority)
  }

  if (sortMode === "title") {
    return String(firstTask?.title ?? "")
      .toLowerCase()
      .trim()
      .localeCompare(
        String(secondTask?.title ?? "")
          .toLowerCase()
          .trim(),
        "es",
      )
  }

  if (sortMode === "created") {
    return toTimestamp(firstTask?.createdAt ?? firstTask?.dateCreation) - toTimestamp(secondTask?.createdAt ?? secondTask?.dateCreation)
  }

  return toTimestamp(firstTask?.dateDeadline) - toTimestamp(secondTask?.dateDeadline)
}

function getTaskCardStateClass(normalizedState) {
  return (
    {
      in_progress: "taskCardInProgress",
      completed: "taskCardCompleted",
      expired: "taskCardExpired",
    }[normalizedState] ?? "taskCardInProgress"
  )
}

function getTaskStateBadgeClass(normalizedState) {
  return (
    {
      in_progress: "stateInProgress",
      completed: "stateCompleted",
      expired: "stateExpired",
    }[normalizedState] ?? "stateInProgress"
  )
}

function getTaskTimeStatusClass(normalizedState) {
  return (
    {
      in_progress: "timeStatusInProgress",
      completed: "timeStatusCompleted",
      expired: "timeStatusExpired",
    }[normalizedState] ?? "timeStatusInProgress"
  )
}

function getTaskStateLabel(normalizedState) {
  return (
    {
      in_progress: "En progreso",
      completed: "Completada",
      expired: "Vencida",
    }[normalizedState] ?? "En progreso"
  )
}

function formatTaskDeadline(dateDeadline) {
  if (!dateDeadline) return "Sin fecha"

  const date = new Date(dateDeadline)
  if (Number.isNaN(date.getTime())) return String(dateDeadline)

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

function getRelativeDeadlineLabel(dateDeadline, state) {
  if (!dateDeadline) return "Sin fecha límite"

  const date = new Date(dateDeadline)
  if (Number.isNaN(date.getTime())) return "Fecha inválida"

  if (state === "completed") return "Completada"

  const diff = date.getTime() - Date.now()
  const absDiff = Math.abs(diff)

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diff < 0) {
    if (days === 0 && hours === 0) return "Vencida hace menos de 1h"
    return `Vencida hace ${days}d ${hours}h`
  }

  if (days === 0 && hours === 0) return "Vence en menos de 1h"
  return `Tiempo restante: ${days}d ${hours}h`
}

function formatForDateTimeLocal(dateValue) {
  if (!dateValue) return ""

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ""

  const pad = (value) => String(value).padStart(2, "0")

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
