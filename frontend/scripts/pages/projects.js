/* ═══════════════════════════════════════════════
   TREECO — projects.js  v2
   scripts/pages/projects.js
   ═══════════════════════════════════════════════ */

// URL base del servidor backend. Todas las peticiones HTTP apuntan aquí.
const API_BASE = "https://treecobackend.onrender.com"

// Estado global de la aplicación. Es el "cerebro" de la página:
// guarda el usuario logueado, la lista de proyectos, el proyecto activo, etc.
const state = {
  user: null, // Datos del usuario autenticado (viene de localStorage)
  projects: [], // Lista completa de proyectos del usuario
  currentProject: null, // Proyecto que está abierto/seleccionado ahora mismo
  currentRole: null, // Rol del usuario en el proyecto seleccionado (OWNER, ADMIN o MEMBER)
  tasks: [], // Tareas del proyecto actual
  members: [], // Miembros del proyecto actual
  taskFilter: "all", // Filtro activo en el tablero: "all", "COMPLETED", "EXPIRED", "IN_PROGRESS"
  taskSearch: "", // Texto escrito en el buscador de tareas
  taskSort: "none", // Criterio de ordenación de tareas: "none", "priority", "deadline", "name"
  editingProjectId: null, // ID del proyecto que se está editando (null si es uno nuevo)
  editingTaskId: null, // ID de la tarea que se está editando (null si es una nueva)
  confirmCb: null, // Función de callback que se ejecuta al confirmar un diálogo de borrado
}

/* ── Paleta de colores ───────────────────────────────────── */
// Colores que se asignan automáticamente a los proyectos según su ID
const PROJ_COLORS = ["#3ddc84", "#4d9fff", "#f5a623", "#ff6b6b", "#bf7fff", "#00d4ff", "#ff9f7f", "#6ee7b7"]
// Colores para los avatares de usuario (círculos con iniciales)
const AVATAR_COLORS = ["#3ddc84", "#4d9fff", "#f5a623", "#ff6b6b", "#bf7fff", "#00d4ff", "#ff9f7f"]

// Devuelve el color correspondiente a un proyecto usando módulo (%) sobre su ID
const projColor = (p) => PROJ_COLORS[Math.abs(p.id || 0) % PROJ_COLORS.length]
// Devuelve el color correspondiente a un usuario usando módulo sobre su ID
const avatarColor = (id) => AVATAR_COLORS[Math.abs(id || 0) % AVATAR_COLORS.length]

/* ════════════════════════════════════════════════
      COMPONENTE: CUSTOM SELECT
      Un desplegable personalizado que reemplaza al <select> nativo del navegador.
      Se usa para: ordenar tareas, asignar roles y asignar responsables.
════════════════════════════════════════════════ */
class CustomSelect {
  // Constructor: recibe el elemento HTML (.custom-select) y una función callback opcional
  // que se ejecuta cada vez que el usuario elige una opción
  constructor(el, onChange) {
    this.el = el // El elemento contenedor del custom select
    this.onChange = onChange // Función que se llama al cambiar el valor
    this.value = el.dataset.value || "" // Valor seleccionado actualmente (del atributo data-value)
    this.trigger = el.querySelector(".custom-select-trigger") // Botón que abre/cierra el desplegable
    this.dropdown = el.querySelector(".custom-select-dropdown") // Panel con las opciones
    this.labelEl = el.querySelector(".custom-select-label") // Texto visible dentro del trigger
    this._bind() // Registra todos los eventos de interacción
  }

  // Calcula y aplica la posición del dropdown en pantalla.
  // Lo abre hacia arriba o hacia abajo según el espacio disponible en el viewport.
  _positionDropdown() {
    const tr = this.trigger.getBoundingClientRect() // Coordenadas del botón trigger
    const dd = this.dropdown
    const GAP = 6 // Espacio en píxeles entre el trigger y el dropdown

    const ddH = dd.offsetHeight || 240 // Alto del dropdown (estimado si aún no está visible)
    const spaceBelow = window.innerHeight - tr.bottom - GAP // Espacio disponible debajo
    const spaceAbove = tr.top - GAP // Espacio disponible arriba
    // Abre hacia arriba si hay poco espacio abajo y más espacio arriba
    const openUp = spaceBelow < ddH && spaceAbove > spaceBelow

    // El ancho del dropdown coincide con el trigger, mínimo 200px
    const w = Math.max(tr.width, 200)
    dd.style.width = w + "px"
    dd.style.left = tr.left + "px"

    if (openUp) {
      // Posición: anclar al borde superior del trigger
      dd.style.top = "auto"
      dd.style.bottom = window.innerHeight - tr.top + GAP + "px"
      this.el.classList.add("open-up")
    } else {
      // Posición: anclar al borde inferior del trigger
      dd.style.top = tr.bottom + GAP + "px"
      dd.style.bottom = "auto"
      this.el.classList.remove("open-up")
    }
  }

  // Registra todos los eventos de interacción del componente
  _bind() {
    // Al hacer clic en el trigger: cierra otros selects abiertos y alterna éste
    this.trigger.addEventListener("click", (e) => {
      e.stopPropagation() // Evita que el clic se propague y cierre este mismo dropdown
      // Cierra cualquier otro custom-select que esté abierto en la página
      document.querySelectorAll(".custom-select.open").forEach((s) => {
        if (s !== this.el) {
          s.classList.remove("open")
          s.classList.remove("open-up")
        }
      })
      this.toggle()
      // Si quedó abierto, calcula la posición óptima del dropdown
      if (this.el.classList.contains("open")) {
        requestAnimationFrame(() => this._positionDropdown())
      }
    })

    this._bindOptions(this.dropdown) // Registra eventos en las opciones iniciales

    // Cierra el dropdown al hacer clic en cualquier parte fuera de él
    document.addEventListener("click", () => this.close())

    // Recalcula posición si el usuario hace scroll mientras el dropdown está abierto
    window.addEventListener(
      "scroll",
      () => {
        if (this.el.classList.contains("open")) this._positionDropdown()
      },
      true,
    )

    // Recalcula posición si la ventana cambia de tamaño
    window.addEventListener("resize", () => {
      if (this.el.classList.contains("open")) this._positionDropdown()
    })
  }

  // Registra el evento de clic en cada opción del desplegable
  _bindOptions(container) {
    container.querySelectorAll(".custom-select-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation() // Evita que el clic cierre el dropdown antes de procesar la selección
        this.setValue(opt.dataset.value, opt)
        this.close()
      })
    })
  }

  // Alterna entre abierto y cerrado
  toggle() {
    this.el.classList.toggle("open")
  }
  // Cierra el dropdown
  close() {
    this.el.classList.remove("open")
    this.el.classList.remove("open-up")
  }
  // Abre el dropdown
  open() {
    this.el.classList.add("open")
  }

  // Actualiza el valor seleccionado y refresca la apariencia visual del trigger
  setValue(val, optEl) {
    this.value = val
    this.el.dataset.value = val // Persiste el valor en el atributo HTML

    // Marca visualmente la opción seleccionada y desmarca las demás
    this.dropdown.querySelectorAll(".custom-select-option").forEach((o) => o.classList.toggle("cs-selected", o.dataset.value === val))

    // Si se pasó el elemento de la opción elegida, actualiza el icono/avatar del trigger
    if (optEl) {
      // Busca el indicador visual (punto de prioridad, punto de rol, avatar...)
      const srcDot = optEl.querySelector(".cs-prio-dot, .cs-role-dot, .cs-avatar, .cs-avatar-empty")
      const tgtDot = this.trigger.querySelector(".cs-prio-dot, .cs-role-dot, .cs-avatar, .cs-avatar-empty")
      if (srcDot && tgtDot) {
        tgtDot.className = srcDot.className // Copia las clases de color/estilo
        if (srcDot.classList.contains("cs-avatar")) {
          // Si es un avatar de usuario, copia también el color de fondo y las iniciales
          tgtDot.style.background = srcDot.style.background
          tgtDot.textContent = srcDot.textContent
        }
      }

      // Determina el texto que se mostrará en el trigger según el tipo de opción
      const hint = optEl.querySelector(".cs-role-hint") // Hint de rol (ej: "Admin")
      const userName = optEl.querySelector(".cs-user-name") // Nombre de usuario
      let rawText
      if (userName) {
        rawText = userName.textContent.trim()
      } else if (hint) {
        // Quita el texto del hint del texto total de la opción
        rawText = optEl.textContent.replace(hint.textContent, "").trim()
      } else {
        rawText = optEl.textContent.trim()
      }
      if (this.labelEl) this.labelEl.textContent = rawText
    }

    // Ejecuta el callback externo si existe (p.ej. para re-renderizar el kanban)
    if (this.onChange) this.onChange(val)
  }

  // Getter: devuelve el valor actualmente seleccionado
  get() {
    return this.value
  }

  // Añade dinámicamente una nueva opción al final del dropdown
  addOption(html) {
    this.dropdown.insertAdjacentHTML("beforeend", html)
    const newOpt = this.dropdown.lastElementChild
    // Registra el evento de clic en la nueva opción
    newOpt.addEventListener("click", (e) => {
      e.stopPropagation()
      this.setValue(newOpt.dataset.value, newOpt)
      this.close()
    })
    // Si el dropdown está abierto, recalcula su posición (puede haber crecido)
    if (this.el.classList.contains("open")) {
      requestAnimationFrame(() => this._positionDropdown())
    }
  }

  // Elimina las opciones del dropdown. Si keepFirst=true, deja la primera (suele ser "Sin asignar")
  clearOptions(keepFirst = true) {
    const opts = [...this.dropdown.querySelectorAll(".custom-select-option")]
    opts.slice(keepFirst ? 1 : 0).forEach((o) => o.remove())
  }
}

// Variables globales que almacenan las instancias de los tres custom selects de la página
let csSort = null // Select para ordenar tareas
let csRole = null // Select para elegir rol al invitar un miembro
let csAssignee = null // Select para asignar una tarea a un miembro

/* ── Funciones de utilidad ───────────────────────────────────── */

// Escapa caracteres especiales HTML para evitar inyección de código (XSS)
// Ejemplo: "<b>" → "&lt;b&gt;"
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Formatea una fecha ISO (ej: "2025-03-15") al formato español "dd/mm/yyyy"
function fmtDate(s) {
  if (!s) return "—"
  const [y, m, d] = s.substring(0, 10).split("-")
  return `${d}/${m}/${y}`
}

// Devuelve la fecha de hoy a las 00:00:00 (medianoche) para comparaciones de fechas
function today0() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Determina el estado visual de una tarea:
// "done"   → completada
// "exp"    → expirada (fecha límite pasada y no completada)
// "active" → en curso
function taskState(t) {
  if (t.completed) return "done"
  if (t.dateDeadline && new Date(t.dateDeadline.substring(0, 10) + "T00:00:00") < today0()) return "exp"
  return "active"
}

// Calcula cuántos días faltan hasta la fecha límite de una tarea.
// Devuelve un número (puede ser negativo si ya expiró) o null si no hay fecha.
function daysUntil(s) {
  if (!s) return null
  return Math.round((new Date(s.substring(0, 10) + "T00:00:00") - today0()) / 86400000)
}

/* ── Funciones HTTP (comunicación con el backend) ────────────────────── */

// Función genérica para hacer peticiones HTTP al backend.
// Lanza un error si la respuesta no es exitosa (código HTTP ≥ 400).
async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } }
  if (body) opts.body = JSON.stringify(body) // Solo añade body si se proporcionó
  const r = await fetch(API_BASE + path, opts)
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || "Error del servidor")
  return data
}

// Atajos para cada método HTTP
const GET = (p) => api("GET", p) // Obtener datos
const POST = (p, b) => api("POST", p, b) // Crear nuevos datos
const PATCH = (p, b) => api("PATCH", p, b) // Actualizar datos parcialmente
const DELETE = (p) => api("DELETE", p) // Eliminar datos

/* ── Sistema de notificaciones (Toast) ───────────────────────── */

// Muestra un mensaje flotante temporal en la esquina inferior derecha.
// type puede ser: "ok" (verde), "err" (rojo) o "info" (azul)
function toast(msg, type = "ok") {
  const el = document.createElement("div")
  el.className = `toast ${type}`
  el.innerHTML = `<span class="toast-dot"></span>${esc(msg)}`
  document.getElementById("toast-container").appendChild(el)
  // Después de 2.8 segundos, añade la clase "out" para la animación de salida
  setTimeout(() => {
    el.classList.add("out")
    // Cuando termina la animación de salida, elimina el elemento del DOM
    el.addEventListener("animationend", () => el.remove(), { once: true })
  }, 2800)
}

/* ── Funciones de control de Modales ─────────────────────────── */

// Abre un modal añadiendo la clase "open" al overlay identificado por su ID
const openModal = (id) => document.getElementById(id).classList.add("open")
// Cierra un modal quitando la clase "open" del overlay identificado por su ID
const closeModal = (id) => document.getElementById(id).classList.remove("open")

// Muestra el modal de confirmación genérico para acciones de eliminación.
// name: nombre del elemento a eliminar (se muestra resaltado)
// warn: advertencia adicional (ej: "Se eliminarán todas sus tareas")
// cb:   función que se ejecuta si el usuario confirma la acción
function showConfirm(name, warn, cb) {
  document.getElementById("confirm-eyebrow").textContent = "Atención"
  document.getElementById("confirm-eyebrow").className = "modal-eyebrow modal-eyebrow-danger"
  document.getElementById("confirm-title").textContent = "Confirmar eliminación"
  document.getElementById("confirm-text").innerHTML = `¿Seguro que quieres eliminar <span class="confirm-name">${esc(name)}</span>?`
  document.getElementById("confirm-warn").textContent = warn || ""
  const btn = document.getElementById("btn-confirm-delete")
  btn.textContent = "Sí, eliminar"
  btn.className = "btn-delete"
  state.confirmCb = cb // Guarda el callback en el estado para ejecutarlo si se confirma
  openModal("modal-confirm")
}

// Muestra el modal de confirmación específico para cambios de rol de un miembro.
// uname:   nombre del usuario cuyo rol va a cambiar
// newRole: nuevo rol que se le asignará ("ADMIN" o "MEMBER")
// cb:      función que se ejecuta si el usuario confirma el cambio
function showRoleConfirm(uname, newRole, cb) {
  const isPromote = newRole === "ADMIN" // true si es ascenso a Admin, false si es degradación
  document.getElementById("confirm-eyebrow").textContent = "Cambiar rol"
  document.getElementById("confirm-eyebrow").className = "modal-eyebrow"
  document.getElementById("confirm-title").textContent = isPromote ? "Dar permisos de Administrador" : "Revocar permisos de Administrador"
  // El texto y el botón cambian dependiendo de si se sube o baja el rol
  document.getElementById("confirm-text").innerHTML = isPromote ? `¿Dar permisos de <strong>Admin</strong> a <span class="confirm-name">${esc(uname)}</span>?<br><span style="font-size:0.78rem;color:rgba(255,255,255,0.3);display:block;margin-top:6px">Podrá invitar y eliminar miembros, y gestionar todas las tareas.</span>` : `¿Quitar los permisos de Admin a <span class="confirm-name">${esc(uname)}</span>?<br><span style="font-size:0.78rem;color:rgba(255,255,255,0.3);display:block;margin-top:6px">Pasará a ser Miembro y solo podrá marcar tareas como completadas.</span>`
  document.getElementById("confirm-warn").textContent = ""
  const btn = document.getElementById("btn-confirm-delete")
  btn.textContent = isPromote ? "Sí, hacer Admin" : "Sí, quitar Admin"
  btn.className = isPromote ? "btn-confirm" : "btn-delete"
  state.confirmCb = cb
  openModal("modal-confirm")
}

/* ── Autenticación ────────────────────────────────────── */

// Carga los datos del usuario desde localStorage.
// Si no existe sesión válida, redirige al login (index.html).
// Devuelve true si hay sesión, false si se redirigió.
function loadUser() {
  try {
    const raw = localStorage.getItem("treeco_user")
    if (!raw) {
      location.replace("index.html")
      return false
    }
    state.user = JSON.parse(raw)
    return true
  } catch {
    // Si el JSON está corrupto o hay otro error, redirige al login
    location.replace("index.html")
    return false
  }
}

/* ════════════════════════════════════════════════
   PROYECTOS
   Funciones para cargar, mostrar, crear, editar y eliminar proyectos
════════════════════════════════════════════════ */

// Carga todos los proyectos del usuario desde el backend y los muestra en el sidebar.
// También restaura el último proyecto que el usuario tenía abierto (guardado en localStorage).
async function loadProjects() {
  const list = document.getElementById("project-list")
  // Muestra un spinner de carga mientras se esperan los datos
  list.innerHTML = `<div class="sidebar-loading"><div class="spinner"></div></div>`
  try {
    const uid = state.user?.userId || state.user?.id // Compatible con ambos formatos de usuario
    if (!uid) {
      location.replace("index.html")
      return
    }

    state.projects = await GET(`/projects?userId=${uid}`)
    renderSidebar()

    // Intenta reabrir el último proyecto visitado (guardado en localStorage)
    const lastId = parseInt(localStorage.getItem("treeco_last_project") || "0")
    if (lastId) {
      const found = state.projects.find((p) => p.id === lastId)
      if (found) await selectProject(found, false) // false = no volver a guardarlo
    }
  } catch (e) {
    list.innerHTML = `<p class="empty-sidebar-msg">Error cargando proyectos</p>`
    toast(e.message, "err")
  }
}

// Filtra los proyectos del sidebar según el texto del buscador.
// Si no hay texto, devuelve todos los proyectos.
function filteredSidebarProjects() {
  const q = document.getElementById("sidebar-search")?.value?.toLowerCase() || ""
  return q ? state.projects.filter((p) => p.name.toLowerCase().includes(q)) : state.projects
}

// Renderiza (dibuja) la lista de proyectos en el sidebar.
// Incluye el dot de color, nombre, porcentaje y botones de acción para el OWNER.
function renderSidebar() {
  const list = document.getElementById("project-list")
  const footer = document.getElementById("proj-count-footer")
  const visible = filteredSidebarProjects()

  // Actualiza el contador del footer ("N proyecto/s")
  footer.textContent = `${state.projects.length} proyecto${state.projects.length !== 1 ? "s" : ""}`

  // Caso: sin proyectos en absoluto
  if (!state.projects.length) {
    list.innerHTML = `<p class="empty-sidebar-msg">Sin proyectos aún.<br>Crea uno con el botón +</p>`
    return
  }

  // Caso: la búsqueda no tiene resultados
  if (!visible.length) {
    list.innerHTML = `<p class="empty-sidebar-msg">Sin resultados</p>`
    return
  }

  list.innerHTML = ""
  visible.forEach((p) => {
    const col = projColor(p)
    const isActive = state.currentProject?.id === p.id

    const el = document.createElement("div")
    el.className = `proj-item${isActive ? " active" : ""}`
    el.dataset.id = p.id

    // Los botones de renombrar/eliminar solo aparecen en el proyecto activo y si el usuario es OWNER
    const showActions = isActive && state.currentRole === "OWNER"

    el.innerHTML = `
            <span class="proj-item-dot" style="background:${col};color:${col}"></span>
            <div class="proj-item-body">
                <div class="proj-item-name">${esc(p.name)}</div>
                <div class="proj-item-sub">${p.progress ?? 0}% completado</div>
            </div>
            <div class="proj-item-actions" style="${showActions ? "" : "display:none"}">
                <button class="btn-row-action" data-action="rename" title="Renombrar">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="btn-row-action del" data-action="delete" title="Eliminar">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 7.2A1 1 0 004.8 12h4.4a1 1 0 001-.8L11 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>`

    // Al hacer clic en el ítem (no en los botones de acción), selecciona el proyecto
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return // Ignora clics en los botones de acción
      selectProject(p)
    })

    // Eventos para los botones de renombrar y eliminar del sidebar
    el.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation()
        if (btn.dataset.action === "rename") openProjectModal(p)
        if (btn.dataset.action === "delete") handleDeleteProject(p)
      })
    })

    list.appendChild(el)
  })
}

// Selecciona un proyecto: carga sus tareas y miembros, actualiza la vista y guarda en localStorage.
// persist=false se usa al restaurar el proyecto desde localStorage (para no volver a escribir el mismo dato)
async function selectProject(p, persist = true) {
  state.currentProject = p
  state.currentRole = null // Se determinará al cargar los miembros

  // Muestra el panel de detalle y oculta el estado vacío
  document.getElementById("proj-empty").style.display = "none"
  document.getElementById("proj-detail").style.display = "block"

  renderProjectHeader(p)

  // Marca el proyecto como activo en el sidebar
  document.querySelectorAll(".proj-item").forEach((el) => el.classList.toggle("active", Number(el.dataset.id) === p.id))

  // Carga tareas y miembros en paralelo (más rápido que hacerlo en serie)
  await Promise.all([loadTasks(), loadMembers()])

  applyPermissions() // Muestra/oculta controles según el rol del usuario
  initInvitePanel() // Inicializa el panel de búsqueda para invitar miembros
  renderCalendarTab() // Carga las fechas límite en la pestaña de calendario

  if (persist) localStorage.setItem("treeco_last_project", String(p.id))
}

// Limpia el proyecto activo y vuelve a la pantalla principal (estado vacío).
// También elimina la referencia del último proyecto visitado en localStorage.
function clearLastProject() {
  localStorage.removeItem("treeco_last_project")
  state.currentProject = null
  state.currentRole = null
  document.getElementById("proj-detail").style.display = "none"
  document.getElementById("proj-empty").style.display = "flex"
  renderSidebar()
  toast("Volviste a la pantalla principal", "info")
}

// Actualiza la cabecera del panel de detalle con el color, nombre y descripción del proyecto
function renderProjectHeader(p) {
  document.getElementById("detail-dot").style.background = projColor(p)
  document.getElementById("detail-name").textContent = p.name
  document.getElementById("detail-desc").textContent = p.description || "Sin descripción"
}

/**
 * Muestra u oculta controles según el rol del usuario en el proyecto actual.
 * OWNER  → todo visible (renombrar, eliminar, invitar, quitar miembros)
 * ADMIN  → puede invitar y quitar miembros, pero NO renombrar ni eliminar proyecto
 * MEMBER → solo lectura, sin ningún control de gestión
 */
function applyPermissions() {
  const role = state.currentRole || "MEMBER"
  const isOwner = role === "OWNER"
  const isAdmin = role === "OWNER" || role === "ADMIN"

  // Renombrar y eliminar proyecto — solo OWNER
  const btnRename = document.getElementById("btn-rename-proj")
  const btnDelete = document.getElementById("btn-delete-proj")
  if (btnRename) btnRename.style.display = isOwner ? "" : "none"
  if (btnDelete) btnDelete.style.display = isOwner ? "" : "none"

  // Panel de invitar miembros — OWNER y ADMIN
  const invitePanel = document.querySelector(".invite-panel")
  if (invitePanel) invitePanel.style.display = isAdmin ? "" : "none"

  // Botón de añadir tarea — solo OWNER y ADMIN
  const btnAddTask = document.getElementById("btn-add-task")
  if (btnAddTask) btnAddTask.style.display = isAdmin ? "" : "none"

  // Elimina el banner informativo si ya existía (para evitar duplicados)
  const existingBanner = document.getElementById("role-info-banner")
  if (existingBanner) existingBanner.remove()

  // Si el usuario es solo MEMBER, muestra un banner informativo
  if (!isAdmin) {
    const banner = document.createElement("div")
    banner.id = "role-info-banner"
    banner.className = "role-info-banner"
    banner.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.3"/>
                <path d="M8 7v4M8 5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Eres <strong>Miembro</strong> — solo puedes marcar tareas como completadas
        `
    // Inserta el banner justo antes de los controles de tareas
    const controls = document.querySelector(".tasks-controls")
    if (controls) controls.parentNode.insertBefore(banner, controls)
  }
}

// Recalcula y actualiza la barra de progreso y los stats del header
// (total de tareas, % completado, miembros)
function updateProgress() {
  const total = state.tasks.length
  const done = state.tasks.filter((t) => t.completed).length
  const expired = state.tasks.filter((t) => taskState(t) === "exp").length
  const active = total - done - expired
  const pct = total ? Math.round((done / total) * 100) : 0

  // Actualiza la barra de progreso visual y el porcentaje numérico
  document.getElementById("detail-progress").style.width = pct + "%"
  document.getElementById("detail-pct").textContent = pct + "%"

  // Actualiza el desglose de tareas debajo de la barra
  document.getElementById("progress-breakdown").innerHTML = `
        <div class="pb-item"><span class="pb-dot" style="background:#6ee7b7"></span>${done} completadas</div>
        <div class="pb-item"><span class="pb-dot" style="background:#60a5fa"></span>${active} en curso</div>
        ${expired ? `<div class="pb-item"><span class="pb-dot" style="background:#fb923c"></span>${expired} vencidas</div>` : ""}
    `

  // Actualiza los tres bloques de estadísticas en el header del proyecto
  document.getElementById("proj-header-stats").innerHTML = `
        <div class="stat-block">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Tareas</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
            <div class="stat-value" style="color:var(--color-text-accent)">${pct}%</div>
            <div class="stat-label">Progreso</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
            <div class="stat-value">${state.members.length}</div>
            <div class="stat-label">Miembros</div>
        </div>
    `

  // Actualiza también el porcentaje en el objeto del estado y en el sidebar
  if (state.currentProject) {
    state.currentProject.progress = pct
    const idx = state.projects.findIndex((x) => x.id === state.currentProject.id)
    if (idx > -1) state.projects[idx].progress = pct
    renderSidebar()
    // Mantiene el proyecto activo resaltado después de re-renderizar el sidebar
    document.querySelectorAll(".proj-item").forEach((el) => el.classList.toggle("active", Number(el.dataset.id) === state.currentProject.id))
  }
}

/* ── Modal para crear o editar un proyecto ── */

// Abre el modal de proyecto. Si se pasa un proyecto (p), entra en modo edición.
// Si p es null, entra en modo creación (campo vacío).
function openProjectModal(p) {
  state.editingProjectId = p ? p.id : null
  document.getElementById("modal-proj-eyebrow").textContent = p ? "Renombrar" : "Nuevo proyecto"
  document.getElementById("modal-proj-title").textContent = p ? "¿Cómo lo renombramos?" : "¿Cómo se llama?"
  document.getElementById("proj-input-name").value = p?.name || ""
  document.getElementById("proj-input-desc").value = p?.description || ""
  openModal("modal-project")
  // Pequeño delay para que el foco ocurra después de la animación de apertura del modal
  setTimeout(() => document.getElementById("proj-input-name").focus(), 80)
}

// Guarda el proyecto al pulsar el botón "Guardar" del modal.
// Si hay un editingProjectId en el estado, actualiza; si no, crea uno nuevo.
document.getElementById("btn-save-project").addEventListener("click", async () => {
  const name = document.getElementById("proj-input-name").value.trim()
  const desc = document.getElementById("proj-input-desc").value.trim()
  if (!name) {
    toast("El nombre es obligatorio", "err")
    return
  }

  try {
    if (state.editingProjectId) {
      // MODO EDICIÓN: actualiza el proyecto en el backend
      const uid = state.user?.userId || state.user?.id
      const updated = await PATCH(`/projects/${state.editingProjectId}`, { name, description: desc, requestingUserId: uid })
      const idx = state.projects.findIndex((p) => p.id === state.editingProjectId)
      if (idx > -1) state.projects[idx] = { ...state.projects[idx], ...updated }
      // Si el proyecto editado es el activo, actualiza también la cabecera
      if (state.currentProject?.id === state.editingProjectId) {
        state.currentProject = { ...state.currentProject, ...updated }
        renderProjectHeader(state.currentProject)
      }
      toast("Proyecto renombrado ✓")
    } else {
      // MODO CREACIÓN: crea un nuevo proyecto y lo añade al inicio de la lista
      const uid = state.user?.userId || state.user?.id
      const created = await POST("/projects", { name, description: desc, userId: uid })
      state.projects.unshift(created)
      toast("Proyecto creado ✓")
    }
    renderSidebar()
    closeModal("modal-project")
  } catch (e) {
    toast(e.message, "err")
  }
})

// Gestiona la eliminación de un proyecto mostrando primero un modal de confirmación.
// Solo se elimina si el usuario confirma en el diálogo.
function handleDeleteProject(p) {
  showConfirm(p.name, "Se eliminarán todas sus tareas y miembros.", async () => {
    try {
      const uid = state.user?.userId || state.user?.id
      await DELETE(`/projects/${p.id}?requestingUserId=${uid}`)
      // Elimina el proyecto del estado local
      state.projects = state.projects.filter((x) => x.id !== p.id)
      // Si el proyecto eliminado era el activo, vuelve a la pantalla vacía
      if (state.currentProject?.id === p.id) {
        state.currentProject = null
        localStorage.removeItem("treeco_last_project")
        document.getElementById("proj-detail").style.display = "none"
        document.getElementById("proj-empty").style.display = "flex"
      }
      renderSidebar()
      toast("Proyecto eliminado")
    } catch (e) {
      toast(e.message, "err")
    }
  })
}

/* ════════════════════════════════════════════════
   TAREAS
   Funciones para cargar, filtrar, ordenar y renderizar las tareas en el tablero Kanban
════════════════════════════════════════════════ */

// Carga las tareas del proyecto actual desde el backend y renderiza el kanban.
async function loadTasks() {
  const board = document.getElementById("kanban-board")
  // Muestra un spinner centrado mientras se cargan las tareas
  board.innerHTML = `<div style="grid-column:1/-1;display:flex;justify-content:center;padding:40px"><div class="spinner"></div></div>`
  try {
    state.tasks = await GET(`/projects/${state.currentProject.id}/tasks`)
    document.getElementById("tc-tasks").textContent = state.tasks.length
    renderKanban()
    updateProgress()
  } catch (e) {
    board.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:32px;color:rgba(255,255,255,0.2)">Error: ${esc(e.message)}</div>`
  }
}

// Devuelve las tareas que deben mostrarse, aplicando el filtro activo, la búsqueda y el orden.
function getVisibleTasks() {
  let tasks = [...state.tasks]

  // 1. Filtro por estado (todas, completadas, expiradas, en curso)
  if (state.taskFilter !== "all") {
    tasks = tasks.filter((t) => {
      const s = taskState(t)
      if (state.taskFilter === "COMPLETED") return s === "done"
      if (state.taskFilter === "EXPIRED") return s === "exp"
      if (state.taskFilter === "IN_PROGRESS") return s === "active"
      return true
    })
  }

  // 2. Búsqueda por texto (título o descripción, sin distinguir mayúsculas)
  if (state.taskSearch) {
    const q = state.taskSearch.toLowerCase()
    tasks = tasks.filter((t) => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
  }

  // 3. Ordenación
  if (state.taskSort === "priority") {
    // Ordena: Alta → Media → Baja
    const order = { HIGH: 0, MID: 1, LOW: 2 }
    tasks.sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1))
  } else if (state.taskSort === "deadline") {
    // Ordena por fecha límite ascendente; las tareas sin fecha van al final
    tasks.sort((a, b) => {
      if (!a.dateDeadline) return 1
      if (!b.dateDeadline) return -1
      return a.dateDeadline.localeCompare(b.dateDeadline)
    })
  } else if (state.taskSort === "name") {
    // Ordena alfabéticamente por título
    tasks.sort((a, b) => a.title.localeCompare(b.title))
  }

  return tasks
}

// Renderiza el tablero Kanban con tres columnas: "En curso", "Vencidas" y "Completadas".
// Cada tarea se coloca en la columna correspondiente según su estado.
function renderKanban() {
  // Definición de las tres columnas con su etiqueta, color de punto y lista de tareas
  const cols = {
    active: { label: "En curso", dot: "#60a5fa", tasks: [] },
    exp: { label: "Vencidas", dot: "#fb923c", tasks: [] },
    done: { label: "Completadas", dot: "#3ddc84", tasks: [] },
  }

  // Distribuye cada tarea en su columna según su estado
  getVisibleTasks().forEach((t) => cols[taskState(t)].tasks.push(t))

  const board = document.getElementById("kanban-board")
  board.innerHTML = ""

  // Crea el HTML de cada columna
  Object.entries(cols).forEach(([key, col]) => {
    const colEl = document.createElement("div")
    colEl.className = "kanban-col"
    colEl.innerHTML = `
            <div class="kanban-col-head">
                <div class="kanban-col-label">
                    <span class="col-status-dot" style="background:${col.dot}"></span>
                    ${col.label}
                </div>
                <span class="kanban-col-count">${col.tasks.length}</span>
            </div>
            <div class="kanban-cards" id="col-${key}"></div>
            <button class="col-add-btn" data-col="${key}">
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <path d="M5 1V9M1 5H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                Añadir tarea
            </button>`

    // El botón "Añadir tarea" solo es visible para OWNER y ADMIN
    const colAddBtn = colEl.querySelector(".col-add-btn")
    if (state.currentRole !== "OWNER" && state.currentRole !== "ADMIN") {
      colAddBtn.style.display = "none"
    } else {
      colAddBtn.addEventListener("click", () => openTaskModal(null))
    }

    board.appendChild(colEl)

    // Renderiza las tarjetas dentro de la columna
    const cards = document.getElementById(`col-${key}`)
    if (!col.tasks.length) {
      cards.innerHTML = `<div class="col-empty">Sin tareas</div>`
    } else {
      col.tasks.forEach((t, i) => {
        const card = buildTaskCard(t)
        // Pequeño retraso escalonado por índice para una animación de entrada más natural
        card.style.animationDelay = `${i * 30}ms`
        cards.appendChild(card)
      })
    }
  })
}

// Metadatos de los tipos de tarea: etiqueta visible, clase CSS e icono SVG
const TASK_TYPE_META = {
  NORMAL: { lbl: "Tarea", cls: "type-NORMAL", svg: `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="1.5" width="9" height="9" rx="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 6l1.5 1.5L8 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  CODE: { lbl: "Código", cls: "type-CODE", svg: `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M3.5 4L1.5 6l2 2M8.5 4l2 2-2 2M6 2.5l-1.5 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  REVIEW: { lbl: "Revisión", cls: "type-REVIEW", svg: `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 6l1.5 1.5L8 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  MEETING: { lbl: "Reunión", cls: "type-MEETING", svg: `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 5h9M4.5 1.5v2M7.5 1.5v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>` },
  DOCUMENTATION: { lbl: "Doc", cls: "type-DOC", svg: `<svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="2" y="1" width="8" height="10" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 4.5h4M4 6.5h4M4 8.5h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>` },
}

// Construye y devuelve el elemento DOM de una tarjeta de tarea para el Kanban.
// Incluye título, descripción, prioridad, tipo, fecha límite y responsable.
function buildTaskCard(t) {
  const st = taskState(t)
  // La etiqueta de prioridad cambia si la tarea está completada o expirada
  const prioKey = st === "done" ? "done" : st === "exp" ? "exp" : t.priority || "MID"
  const prioLbl = st === "done" ? "Hecha" : st === "exp" ? "Vencida" : { HIGH: "Alta", MID: "Media", LOW: "Baja" }[t.priority] || "Media"

  const canEdit = state.currentRole === "OWNER" || state.currentRole === "ADMIN"
  const typeMeta = TASK_TYPE_META[t.type] || TASK_TYPE_META.NORMAL

  // Bloque HTML para la fecha límite (con indicador visual si está próxima o vencida)
  let dlHtml = ""
  if (t.dateDeadline) {
    const days = daysUntil(t.dateDeadline)
    let cls = ""
    if (!t.completed && days !== null) {
      if (days < 0)
        cls = "expired" // Pasada la fecha
      else if (days <= 3) cls = "soon" // Vence en 3 días o menos
    }
    dlHtml = `<span class="task-deadline ${cls}">${days !== null && days < 0 ? "⚠" : "📅"} ${fmtDate(t.dateDeadline)}</span>`
  }

  // Bloque HTML del avatar y nombre del responsable asignado a la tarea
  let assigneeHtml = ""
  if (t.assignedTo) {
    const initials = (t.assignedTo.username || "?").substring(0, 2).toUpperCase()
    const col = avatarColor(t.assignedTo.id || 0)
    const myId = state.user?.userId || state.user?.id
    const isMe = t.assignedTo.id === myId
    assigneeHtml = `
            <div class="task-assignee-wrap" title="Asignado a ${esc(t.assignedTo.username)}">
                <span class="task-assignee-bubble" style="background:${col}">${initials}</span>
                <span class="task-assignee-name">${isMe ? "Yo" : esc(t.assignedTo.username)}</span>
            </div>`
  }

  // Construye el elemento de la tarjeta
  const card = document.createElement("div")
  card.className = `task-card${t.completed ? " completed" : ""}`
  card.innerHTML = `
        <div class="task-card-top">
            <div class="task-card-title">${esc(t.title)}</div>
            <div class="task-card-btns">
                ${
                  canEdit
                    ? `
                <button class="task-card-btn" data-action="edit" title="Editar">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M9.5 2.5L11.5 4.5L5 11H3V9L9.5 2.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                    </svg>
                </button>`
                    : ""
                }
                <button class="task-card-btn" data-action="toggle" title="${t.completed ? "Reabrir" : "Completar"}">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        ${t.completed ? `<path d="M10 3L5 9L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`}
                    </svg>
                </button>
                ${
                  canEdit
                    ? `
                <button class="task-card-btn del" data-action="delete" title="Eliminar">
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M3 4l.8 7.2A1 1 0 004.8 12h4.4a1 1 0 001-.8L11 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>`
                    : ""
                }
            </div>
        </div>
        ${t.description ? `<div class="task-card-desc">${esc(t.description)}</div>` : ""}
        <div class="task-card-footer">
            <div class="task-card-meta">
                <span class="prio-chip prio-${prioKey}">${prioLbl}</span>
                <span class="task-type-badge ${typeMeta.cls}">${typeMeta.svg}${typeMeta.lbl}</span>
                ${t.codeTask?.language ? `<span class="code-lang-chip">${esc(t.codeTask.language)}</span>` : ""}
                ${dlHtml}
            </div>
            ${assigneeHtml}
        </div>`

  // Registra los eventos de los botones de la tarjeta (solo si tiene permisos de edición)
  if (canEdit) {
    card.querySelector("[data-action='edit']")?.addEventListener("click", (e) => {
      e.stopPropagation()
      openTaskModal(t)
    })
    card.querySelector("[data-action='delete']")?.addEventListener("click", (e) => {
      e.stopPropagation()
      handleDeleteTask(t)
    })
  }
  // El botón de completar/reabrir está disponible para todos los roles
  card.querySelector("[data-action='toggle']").addEventListener("click", (e) => {
    e.stopPropagation()
    toggleTask(t)
  })

  return card
}

/* ── Modal de tarea ── */

// Abre el modal para crear o editar una tarea.
// Si se pasa una tarea (t), precarga sus datos en el formulario.
// Si t es null, abre el modal en modo creación con campos vacíos.
function openTaskModal(t) {
  state.editingTaskId = t ? t.id : null
  document.getElementById("modal-task-eyebrow").textContent = t ? "Editar tarea" : "Nueva tarea"
  document.getElementById("modal-task-title").textContent = t ? "Modificar detalles" : "Detalles de la tarea"
  document.getElementById("task-input-title").value = t?.title || ""
  document.getElementById("task-input-desc").value = t?.description || ""

  // Reinicia el date picker con la fecha de la tarea o lo limpia si es tarea nueva
  if (window._dpReset) window._dpReset(t?.dateDeadline?.substring(0, 10) || "")

  // Selecciona el tipo de tarea activo (pill)
  const currentType = t?.type || "NORMAL"
  document.querySelectorAll(".type-pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === currentType)
  })
  toggleCodeSection(currentType) // Muestra/oculta campos extra de código

  // Recarga las opciones del select de responsable con los miembros actuales del proyecto
  if (csAssignee) {
    csAssignee.clearOptions(true) // Limpia opciones anteriores, dejando "Sin asignar"
    state.members.forEach((m) => {
      const uid = m.user?.id
      const uname = m.user?.username || `Usuario #${uid}`
      const uemail = m.user?.email || ""
      const col = avatarColor(uid)
      const initials = uname.substring(0, 2).toUpperCase()
      csAssignee.addOption(`
                <div class="custom-select-option" data-value="${uid}">
                    <span class="cs-avatar" style="background:${col}">${initials}</span>
                    <div class="cs-user-info">
                        <span class="cs-user-name">${esc(uname)}</span>
                        ${uemail ? `<span class="cs-user-email">${esc(uemail)}</span>` : ""}
                    </div>
                </div>`)
    })
    // Pre-selecciona el responsable actual de la tarea (o "Sin asignar" si no tiene)
    const assignedId = t?.assignedTo?.id ? String(t.assignedTo.id) : ""
    const assignedOpt = assignedId ? csAssignee.dropdown.querySelector(`[data-value="${assignedId}"]`) : csAssignee.dropdown.querySelector(`[data-value=""]`)
    csAssignee.setValue(assignedId, assignedOpt)
  }

  // Rellena los campos específicos de tareas de tipo CÓDIGO
  document.getElementById("code-input-language").value = t?.codeTask?.language || ""
  document.getElementById("code-input-branch").value = t?.codeTask?.branchName || ""
  document.getElementById("code-input-repo").value = t?.codeTask?.repositoryUrl || ""

  openModal("modal-task")
  setTimeout(() => document.getElementById("task-input-title").focus(), 80)
}

// Muestra u oculta la sección de campos extra para tareas de tipo "CODE"
function toggleCodeSection(type) {
  const section = document.getElementById("code-task-section")
  if (!section) return
  section.style.display = type === "CODE" ? "block" : "none"
}

// Evento: al hacer clic en una píldora de tipo de tarea, la activa y refresca la sección de código
document.getElementById("task-type-pills").addEventListener("click", (e) => {
  const pill = e.target.closest(".type-pill")
  if (!pill) return
  document.querySelectorAll(".type-pill").forEach((p) => p.classList.remove("active"))
  pill.classList.add("active")
  toggleCodeSection(pill.dataset.type)
})

// Calcula la prioridad sugerida a partir de la fecha límite:
// ≤3 días → Alta, ≤7 días → Media, >7 días → Baja
function calcPriorityFromDeadline(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dl = new Date(dateStr + "T00:00:00")
  const days = Math.ceil((dl - today) / 86400000)
  if (days <= 3) return { prio: "HIGH", label: "Alta", sub: `Vence en ${days === 0 ? "hoy" : days + "d"}`, color: "#ff6464" }
  if (days <= 7) return { prio: "MID", label: "Media", sub: `Vence en ${days}d`, color: "#fbbf24" }
  return { prio: "LOW", label: "Baja", sub: `Vence en ${days}d`, color: "#3ddc84" }
}

// Muestra o actualiza el hint de prioridad debajo del campo de fecha límite
function updatePrioHint(dateStr) {
  const hint = document.getElementById("prio-hint")
  const dot = document.getElementById("prio-hint-dot")
  const lbl = document.getElementById("prio-hint-label")
  const sub = document.getElementById("prio-hint-sub")
  if (!hint) return

  const result = calcPriorityFromDeadline(dateStr)
  if (!result) {
    hint.style.display = "none"
    return
  }

  hint.style.display = "flex"
  dot.style.background = result.color
  lbl.textContent = result.label
  sub.textContent = result.sub
  hint.dataset.prio = result.prio // Guarda el valor de prioridad para usarlo al guardar la tarea
}

/* ── Date picker personalizado ────────────────────────────────────────────
   Se inicializa una sola vez al cargar la página (IIFE = función autoejecutable).
   Permite al usuario elegir una fecha mediante un calendario popup personalizado.
*/
;(function initDatePicker() {
  // Referencias a todos los elementos del date picker
  const trigger = document.getElementById("date-trigger") // Botón que abre el calendario
  const triggerLbl = document.getElementById("date-trigger-label") // Texto dentro del botón
  const clearInner = document.getElementById("date-clear-btn") // Botón "×" para limpiar la fecha
  const popover = document.getElementById("date-popover") // Panel del calendario
  const grid = document.getElementById("dp-grid") // Cuadrícula con los días
  const monthLbl = document.getElementById("dp-month-label") // Etiqueta "Marzo 2025"
  const btnPrev = document.getElementById("dp-prev") // Botón ← mes anterior
  const btnNext = document.getElementById("dp-next") // Botón → mes siguiente
  const btnToday = document.getElementById("dp-today-btn") // Botón "Hoy"
  const btnClear = document.getElementById("dp-clear-btn") // Botón "Limpiar" en el footer
  const hiddenInput = document.getElementById("task-input-deadline") // Input oculto con el valor ISO

  // Estado interno del date picker
  let dpYear = new Date().getFullYear()
  let dpMonth = new Date().getMonth()
  let dpSelected = null // Fecha seleccionada como objeto Date, o null si no hay ninguna

  // Nombres de los meses en español
  const MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  // Convierte un objeto Date a string ISO "YYYY-MM-DD"
  function dpDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }

  // Formatea una fecha para mostrarla en el trigger (ej: "15 mar 2025")
  function dpFmtLabel(d) {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
  }

  // Dibuja la cuadrícula de días del mes actual en el calendario
  function renderDpGrid() {
    // Pone en mayúscula la primera letra del mes
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
    monthLbl.textContent = cap(`${MES[dpMonth]} ${dpYear}`)
    grid.innerHTML = ""

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstDay = new Date(dpYear, dpMonth, 1)
    // Calcula el offset para que la semana empiece en Lunes (0=Lunes, 6=Domingo)
    const offset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(dpYear, dpMonth + 1, 0).getDate()

    // Añade celdas vacías para los días antes del primer día del mes
    for (let i = 0; i < offset; i++) {
      const blank = document.createElement("span")
      blank.className = "dp-day dp-blank"
      grid.appendChild(blank)
    }

    // Crea un botón para cada día del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(dpYear, dpMonth, d)
      const dayEl = document.createElement("button")
      dayEl.type = "button"
      dayEl.className = "dp-day"
      dayEl.textContent = d

      // Aplica clases visuales según la relación del día con hoy y con la fecha seleccionada
      if (date < today) {
        dayEl.classList.add("dp-past") // Días pasados: apagados
      } else if (+date === +today) {
        dayEl.classList.add("dp-today") // Hoy: resaltado en verde
      }
      if (dpSelected && dpDateStr(date) === dpDateStr(dpSelected)) {
        dayEl.classList.add("dp-selected") // Día seleccionado: fondo verde sólido
      } else if (dpSelected && date > today && date < dpSelected) {
        // Días entre hoy y la fecha seleccionada: rango sombreado
        dayEl.classList.add("dp-in-range")
        if (+date === +today) dayEl.classList.add("dp-in-range-start")
        const nextDate = new Date(dpYear, dpMonth, d + 1)
        if (dpDateStr(nextDate) === dpDateStr(dpSelected)) dayEl.classList.add("dp-in-range-end")
      }

      // Al hacer clic en un día, selecciona esa fecha
      dayEl.addEventListener("click", () => {
        dpSelected = date
        const val = dpDateStr(date)
        hiddenInput.value = val
        triggerLbl.textContent = dpFmtLabel(date)
        trigger.classList.add("date-trigger-set")
        clearInner.style.display = "flex"
        closeDp()
        updatePrioHint(val) // Actualiza el hint de prioridad con la nueva fecha
      })

      grid.appendChild(dayEl)
    }
  }

  // Abre el popover del calendario y lo posiciona (arriba o abajo según espacio disponible)
  function openDp() {
    popover.style.display = "block"
    trigger.classList.add("dp-open")
    renderDpGrid()
    requestAnimationFrame(() => {
      const rect = popover.getBoundingClientRect()
      if (rect.bottom > window.innerHeight - 20) {
        popover.classList.add("dp-up") // No cabe abajo → abre hacia arriba
      } else {
        popover.classList.remove("dp-up")
      }
    })
  }

  // Cierra el popover del calendario
  function closeDp() {
    popover.style.display = "none"
    trigger.classList.remove("dp-open")
  }

  // Limpia la fecha seleccionada y resetea el trigger a su estado vacío
  function clearDate() {
    dpSelected = null
    hiddenInput.value = ""
    triggerLbl.textContent = "Sin fecha"
    trigger.classList.remove("date-trigger-set")
    clearInner.style.display = "none"
    updatePrioHint("")
    closeDp()
  }

  // Abre/cierra el calendario al hacer clic en el trigger
  // Si el clic fue en el botón "×", lo ignora (lo gestiona su propio listener)
  trigger.addEventListener("click", (e) => {
    if (e.target.closest("#date-clear-btn")) return
    popover.style.display === "none" ? openDp() : closeDp()
  })

  clearInner.addEventListener("click", (e) => {
    e.stopPropagation()
    clearDate()
  })

  // Navegación entre meses: botón ← (anterior)
  btnPrev.addEventListener("click", () => {
    dpMonth--
    if (dpMonth < 0) {
      dpMonth = 11
      dpYear--
    } // Si pasa de enero, retrocede al diciembre anterior
    renderDpGrid()
  })

  // Navegación entre meses: botón → (siguiente)
  btnNext.addEventListener("click", () => {
    dpMonth++
    if (dpMonth > 11) {
      dpMonth = 0
      dpYear++
    } // Si pasa de diciembre, avanza al enero siguiente
    renderDpGrid()
  })

  // Botón "Hoy": selecciona la fecha de hoy y cierra el calendario
  btnToday.addEventListener("click", () => {
    const today = new Date()
    dpYear = today.getFullYear()
    dpMonth = today.getMonth()
    dpSelected = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const val = dpDateStr(dpSelected)
    hiddenInput.value = val
    triggerLbl.textContent = dpFmtLabel(dpSelected)
    trigger.classList.add("date-trigger-set")
    clearInner.style.display = "flex"
    closeDp()
    updatePrioHint(val)
  })

  // Botón "Limpiar" del footer: borra la fecha
  btnClear.addEventListener("click", clearDate)

  // Cierra el calendario si el usuario hace clic fuera del contenedor del date picker
  document.addEventListener(
    "click",
    (e) => {
      const wrap = trigger.closest(".date-field-wrap") || trigger.closest(".form-group")
      if (wrap && !wrap.contains(e.target)) closeDp()
    },
    true,
  )

  // Expone la función de reset para que openTaskModal() pueda precargarlo con una fecha existente
  // Si se pasa una fecha (dateStr), la selecciona; si se pasa vacío, limpia el picker.
  window._dpReset = (dateStr) => {
    if (dateStr) {
      const [y, m, d] = dateStr.split("-").map(Number)
      dpSelected = new Date(y, m - 1, d)
      dpYear = dpSelected.getFullYear()
      dpMonth = dpSelected.getMonth()
      hiddenInput.value = dateStr
      triggerLbl.textContent = dpFmtLabel(dpSelected)
      trigger.classList.add("date-trigger-set")
      clearInner.style.display = "flex"
    } else {
      dpSelected = null
      const n = new Date()
      dpYear = n.getFullYear()
      dpMonth = n.getMonth()
      hiddenInput.value = ""
      triggerLbl.textContent = "Sin fecha"
      trigger.classList.remove("date-trigger-set")
      clearInner.style.display = "none"
    }
    updatePrioHint(dateStr || "")
  }
})() // Se ejecuta inmediatamente al cargar la página

// Guarda una tarea (nueva o editada) al pulsar el botón "Guardar" del modal de tarea
document.getElementById("btn-save-task").addEventListener("click", async () => {
  const title = document.getElementById("task-input-title").value.trim()
  const desc = document.getElementById("task-input-desc").value.trim()
  const deadline = document.getElementById("task-input-deadline").value || null

  // Obtiene el tipo de tarea de la píldora activa
  const activeTypePill = document.querySelector(".type-pill.active")
  const taskType = activeTypePill ? activeTypePill.dataset.type : "NORMAL"

  // La prioridad se deriva automáticamente de la fecha límite (misma lógica que el backend)
  const _hint = document.getElementById("prio-hint")
  const priority = _hint && _hint.dataset.prio ? _hint.dataset.prio : "MID"

  // Lee el responsable asignado desde el custom select
  const assigneeVal = csAssignee ? csAssignee.get() : ""
  const assignedToId = assigneeVal ? parseInt(assigneeVal) : null

  // Lee los campos extra de tareas de código
  const language = document.getElementById("code-input-language").value.trim() || null
  const branchName = document.getElementById("code-input-branch").value.trim() || null
  const repositoryUrl = document.getElementById("code-input-repo").value.trim() || null

  if (!title) {
    toast("El título es obligatorio", "err")
    return
  }

  // Construye el objeto de datos que se enviará al backend
  const payload = {
    title,
    description: desc,
    priority,
    dateDeadline: deadline ? deadline + "T00:00:00" : null,
    type: taskType,
    language,
    branchName,
    repositoryUrl,
  }

  try {
    if (state.editingTaskId) {
      // MODO EDICIÓN: -1 en assignedToId significa "quitar responsable"
      payload.assignedToId = assigneeVal === "" ? -1 : assignedToId
      const updated = await PATCH(`/projects/${state.currentProject.id}/tasks/${state.editingTaskId}`, payload)
      const idx = state.tasks.findIndex((t) => t.id === state.editingTaskId)
      if (idx > -1) state.tasks[idx] = updated
      toast("Tarea actualizada ✓")
    } else {
      // MODO CREACIÓN
      payload.assignedToId = assignedToId
      const created = await POST(`/projects/${state.currentProject.id}/tasks`, payload)
      state.tasks.unshift(created) // La nueva tarea aparece al principio
      document.getElementById("tc-tasks").textContent = state.tasks.length
      toast("Tarea creada ✓")
    }
    closeModal("modal-task")
    renderKanban()
    updateProgress()
    renderCalendarTab()
  } catch (e) {
    toast(e.message, "err")
  }
})

// Alterna el estado completado/no-completado de una tarea
async function toggleTask(t) {
  try {
    const updated = await PATCH(`/projects/${state.currentProject.id}/tasks/${t.id}`, { completed: !t.completed })
    const idx = state.tasks.findIndex((x) => x.id === t.id)
    if (idx > -1) state.tasks[idx] = updated
    renderKanban()
    updateProgress()
    renderCalendarTab()
    toast(updated.completed ? "Completada ✓" : "Reabierta", updated.completed ? "ok" : "info")
  } catch (e) {
    toast(e.message, "err")
  }
}

// Gestiona la eliminación de una tarea mostrando primero un modal de confirmación
function handleDeleteTask(t) {
  showConfirm(t.title, "", async () => {
    try {
      await DELETE(`/projects/${state.currentProject.id}/tasks/${t.id}`)
      state.tasks = state.tasks.filter((x) => x.id !== t.id)
      document.getElementById("tc-tasks").textContent = state.tasks.length
      renderKanban()
      updateProgress()
      renderCalendarTab()
      toast("Tarea eliminada")
    } catch (e) {
      toast(e.message, "err")
    }
  })
}

/* ════════════════════════════════════════════════
   MIEMBROS
   Funciones para cargar, mostrar y gestionar los miembros del proyecto
════════════════════════════════════════════════ */

// Carga los miembros del proyecto actual y determina el rol del usuario en él
async function loadMembers() {
  const grid = document.getElementById("members-grid")
  grid.innerHTML = `<div style="display:flex;justify-content:center;padding:28px"><div class="spinner"></div></div>`
  try {
    state.members = await GET(`/projects/${state.currentProject.id}/members`)
    document.getElementById("tc-members").textContent = state.members.length

    // Busca el rol del usuario actual entre los miembros cargados
    const myId = state.user?.userId || state.user?.id
    const me = state.members.find((m) => (m.user?.id || m.userId) === myId)
    state.currentRole = me?.role || "MEMBER"

    renderMembers()
    updateProgress() // Actualiza el stat de miembros en la cabecera
  } catch (e) {
    grid.innerHTML = `<p class="members-empty">Error cargando miembros</p>`
    toast(e.message, "err")
  }
}

// Renderiza la lista de miembros del proyecto.
// Muestra avatar, nombre, email, badge de rol y botones de acción según los permisos.
function renderMembers() {
  const grid = document.getElementById("members-grid")
  grid.innerHTML = ""

  if (!state.members.length) {
    grid.innerHTML = `<p class="members-empty">Sin miembros aún — invita a alguien →</p>`
    return
  }

  const myRole = state.currentRole || "MEMBER"
  const isOwner = myRole === "OWNER"
  const isAdmin = myRole === "OWNER" || myRole === "ADMIN"
  const myId = state.user?.userId || state.user?.id
  // Mapa de valores de rol a etiquetas en español para el badge
  const ROLE_LBL = { OWNER: "Dueño", ADMIN: "Admin", MEMBER: "Miembro" }

  state.members.forEach((m, i) => {
    const uid = m.user?.id || 0
    const uname = m.user?.username || m.user?.email || `Usuario #${uid}`
    const col = avatarColor(uid)
    const initials = uname.substring(0, 2).toUpperCase()
    const isMe = uid === myId
    const memberOwner = m.role === "OWNER"

    // Permisos para las acciones de cada fila:
    // - Solo el OWNER puede cambiar roles, y no puede cambiar el suyo propio ni el de otro OWNER
    const canChangeRole = isOwner && !memberOwner && !isMe
    // - OWNER y ADMIN pueden eliminar miembros, pero no al OWNER ni a sí mismos
    const canRemove = isAdmin && !memberOwner && !isMe

    // El siguiente rol al que se puede cambiar (toggle entre MEMBER y ADMIN)
    const nextRole = m.role === "MEMBER" ? "ADMIN" : "MEMBER"
    const roleLabel = m.role === "MEMBER" ? "Hacer Admin" : "Quitar Admin"

    const row = document.createElement("div")
    row.className = "member-row"
    row.style.animationDelay = `${i * 40}ms` // Animación de entrada escalonada
    row.innerHTML = `
            <div class="member-avatar" style="background:${col}">${initials}</div>
            <div class="member-info">
                <div class="member-name">
                    ${esc(uname)}${isMe ? `<span class="member-you-tag">(tú)</span>` : ""}
                </div>
                <div class="member-sub">${esc(m.user?.email || `ID #${uid}`)}</div>
            </div>
            <span class="member-role-badge role-${m.role}">${ROLE_LBL[m.role] || m.role}</span>
            ${
              canChangeRole || canRemove
                ? `
            <div class="member-actions">
                ${
                  canChangeRole
                    ? `<button class="btn-member-action" data-action="role" title="${roleLabel}">
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                        ${m.role === "MEMBER" ? `<path d="M7 2a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM2 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5M10.5 7v3M12 8.5h-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>` : `<path d="M7 2a2.5 2.5 0 110 5 2.5 2.5 0 010-5zM2 13c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5M9.5 9h3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`}
                    </svg>${roleLabel}</button>`
                    : ""
                }
                ${
                  canRemove
                    ? `<button class="btn-member-action btn-member-remove" data-action="remove" title="Quitar del proyecto">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg></button>`
                    : ""
                }
            </div>`
                : ""
            }
        `

    // Eventos de los botones de acción de cada fila de miembro
    row.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.action === "role") {
          // Muestra el diálogo de confirmación de cambio de rol
          showRoleConfirm(uname, nextRole, async () => {
            try {
              await PATCH(`/projects/${state.currentProject.id}/members/${uid}/role`, { newRole: nextRole })
              const idx = state.members.findIndex((x) => (x.user?.id || x.userId) === uid)
              if (idx > -1) state.members[idx] = { ...state.members[idx], role: nextRole }
              renderMembers()
              toast(`${uname} es ahora ${ROLE_LBL[nextRole]} ✓`)
            } catch (e) {
              toast(e.message, "err")
            }
          })
        }
        if (btn.dataset.action === "remove") {
          // Muestra el diálogo de confirmación de eliminación de miembro
          showConfirm(uname, "El usuario perderá acceso al proyecto.", async () => {
            try {
              await DELETE(`/projects/${state.currentProject.id}/members/${uid}`)
              state.members = state.members.filter((x) => (x.user?.id || x.userId) !== uid)
              document.getElementById("tc-members").textContent = state.members.length
              renderMembers()
              updateProgress()
              toast("Miembro eliminado")
            } catch (e) {
              toast(e.message, "err")
            }
          })
        }
      })
    })

    grid.appendChild(row)
  })
}

/* ════════════════════════════════════════════════
   INVITAR MIEMBROS — búsqueda por nombre/email
   Permite buscar usuarios del sistema y añadirlos al proyecto
════════════════════════════════════════════════ */

let inviteDebounce = null // Temporizador para el debounce de la búsqueda (evita peticiones en cada tecla)
let inviteSelected = null // Usuario seleccionado para invitar: { id, username, email }

// Inicializa el panel de búsqueda para invitar miembros.
// Registra el evento de búsqueda con debounce y el cierre al hacer clic fuera.
function initInvitePanel() {
  const searchInput = document.getElementById("invite-search")
  const results = document.getElementById("invite-results")
  const spinner = document.getElementById("invite-spinner")
  const selectedBox = document.getElementById("invite-selected")
  const selectedUser = document.getElementById("invite-selected-user")

  if (!searchInput) return // Si no existe el panel (puede no estar en el DOM), sale

  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim()
    clearTimeout(inviteDebounce) // Cancela la búsqueda pendiente anterior

    // Si el usuario borra texto después de haber seleccionado a alguien, limpia la selección
    if (inviteSelected) {
      inviteSelected = null
      selectedBox.style.display = "none"
    }

    // No busca si hay menos de 2 caracteres
    if (q.length < 2) {
      results.style.display = "none"
      results.innerHTML = ""
      spinner.style.display = "none"
      return
    }

    // Muestra el spinner mientras espera el debounce
    spinner.style.display = "flex"
    results.style.display = "none"

    // Espera 320ms desde la última tecla pulsada antes de hacer la petición (debounce)
    inviteDebounce = setTimeout(async () => {
      try {
        const users = await GET(`/api/users/search?q=${encodeURIComponent(q)}`)
        spinner.style.display = "none"
        renderSearchResults(users, results, selectedBox, selectedUser, searchInput)
      } catch (e) {
        console.log(e)
        spinner.style.display = "none"
        results.innerHTML = `<div class="invite-no-results">Error buscando usuarios</div>`
        results.style.display = "block"
      }
    }, 320)
  })

  // Cierra el dropdown de resultados al hacer clic fuera del panel de invitación
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".invite-panel")) {
      results.style.display = "none"
    }
  })
}

// Renderiza los resultados de búsqueda de usuarios en el dropdown de invitación.
// Los usuarios que ya son miembros aparecen desactivados.
function renderSearchResults(users, resultsEl, selectedBox, selectedUser, searchInput) {
  const memberIds = new Set(state.members.map((m) => m.user?.id))
  const myId = state.user?.userId || state.user?.id

  // Filtra: no muestra al usuario actual (no puede invitarse a sí mismo)
  const filtered = users.filter((u) => u.id !== myId)

  resultsEl.innerHTML = ""

  if (!filtered.length) {
    resultsEl.innerHTML = `<div class="invite-no-results">Sin resultados para esa búsqueda</div>`
    resultsEl.style.display = "block"
    return
  }

  filtered.forEach((u) => {
    const alreadyMember = memberIds.has(u.id)
    const col = avatarColor(u.id)
    const initials = u.username.substring(0, 2).toUpperCase()

    const item = document.createElement("div")
    // Si ya es miembro, se añade la clase "already-member" que lo deshabilita visualmente
    item.className = `invite-result-item${alreadyMember ? " already-member" : ""}`
    item.innerHTML = `
            <div class="invite-result-avatar" style="background:${col}">${initials}</div>
            <div class="invite-result-info">
                <div class="invite-result-name">${esc(u.username)}</div>
                <div class="invite-result-email">${esc(u.email)}</div>
            </div>
            ${alreadyMember ? `<span class="invite-result-badge">Ya miembro</span>` : ""}`

    // Solo se puede seleccionar si no es ya miembro
    if (!alreadyMember) {
      item.addEventListener("click", () => {
        inviteSelected = u
        resultsEl.style.display = "none"
        searchInput.value = u.username

        // Muestra el preview del usuario seleccionado con su avatar y datos
        selectedUser.innerHTML = `
                    <div class="invite-result-avatar" style="background:${col};width:28px;height:28px;font-size:0.65rem">${initials}</div>
                    <div class="invite-result-info">
                        <div class="invite-result-name">${esc(u.username)}</div>
                        <div class="invite-result-email">${esc(u.email)}</div>
                    </div>`
        selectedBox.style.display = "flex"
      })
    }

    resultsEl.appendChild(item)
  })

  resultsEl.style.display = "block"
}

// Envía la invitación al hacer clic en el botón "Añadir miembro"
document.getElementById("btn-add-member").addEventListener("click", async () => {
  if (!inviteSelected) {
    toast("Selecciona un usuario de los resultados", "err")
    return
  }

  const role = csRole ? csRole.get() : "MEMBER" // Rol elegido en el custom select
  const invitedByUserId = state.user?.userId || state.user?.id // ID del usuario que invita

  try {
    const member = await POST(`/projects/${state.currentProject.id}/members`, { userId: inviteSelected.id, role, invitedByUserId })
    state.members.push(member)
    document.getElementById("tc-members").textContent = state.members.length
    renderMembers()
    updateProgress()

    // Limpia el panel de invitación para la siguiente búsqueda
    document.getElementById("invite-search").value = ""
    document.getElementById("invite-selected").style.display = "none"
    document.getElementById("invite-results").style.display = "none"
    inviteSelected = null
    toast(`${member.user?.username || "Usuario"} invitado ✓`)
  } catch (e) {
    toast(e.message, "err")
  }
})

/* ════════════════════════════════════════════════
   TAB CALENDARIO
   Muestra las próximas fechas límite del usuario en la pestaña de Calendario
════════════════════════════════════════════════ */
function renderCalendarTab() {
  // Botón que redirige al calendario completo del proyecto
  const btn = document.getElementById("btn-go-calendar")
  if (btn) btn.onclick = () => (location.href = `calendar.html?projectId=${state.currentProject.id}`)

  const container = document.getElementById("cal-redirect-upcoming")
  if (!container) return

  const myId = state.user?.userId || state.user?.id

  // Filtra solo las tareas del usuario actual (las que le están asignadas o sin asignar)
  const myTasks = state.tasks.filter((t) => {
    if (!t.assignedTo) return true // Sin asignar → visibles para todos
    return Number(t.assignedTo.id) === Number(myId)
  })

  // Tareas próximas: no completadas, con fecha, con fecha futura, ordenadas por días restantes
  const upcoming = myTasks
    .filter((t) => !t.completed && t.dateDeadline)
    .map((t) => ({ ...t, _d: daysUntil(t.dateDeadline) }))
    .filter((t) => t._d !== null && t._d >= 0)
    .sort((a, b) => a._d - b._d)
    .slice(0, 6) // Máximo 6 tareas en la vista previa

  // Tareas vencidas: no completadas y con fecha pasada
  const expired = myTasks.filter((t) => !t.completed && t.dateDeadline && daysUntil(t.dateDeadline) < 0)

  if (!upcoming.length && !expired.length) {
    container.innerHTML = `<p class="upcoming-empty">Sin fechas límite próximas para ti</p>`
    return
  }

  let html = `<p class="upcoming-title">Mis próximas fechas límite</p><div class="upcoming-list">`

  // Si hay tareas vencidas, muestra un resumen agrupado en rojo
  if (expired.length) {
    html += `<div class="upcoming-row">
            <span class="up-side" style="background:var(--color-error)"></span>
            <div class="up-info">
                <span class="up-name">${expired.length} tarea${expired.length > 1 ? "s" : ""} vencida${expired.length > 1 ? "s" : ""}</span>
            </div>
            <span class="up-badge badge-urgent">Vencidas</span>
        </div>`
  }

  // Renderiza cada tarea próxima con su barra de color según prioridad y su badge de tiempo
  upcoming.forEach((t) => {
    // Clase CSS del badge según días restantes
    const cls = t._d === 0 ? "badge-today" : t._d <= 2 ? "badge-urgent" : t._d <= 7 ? "badge-soon" : "badge-normal"
    // Texto del badge
    const lbl = t._d === 0 ? "Hoy" : t._d === 1 ? "Mañana" : `${t._d}d`
    // Color de la barra lateral según prioridad
    const bar = t.priority === "HIGH" ? "#ff8888" : t.priority === "LOW" ? "#6ee7b7" : "#fbbf24"
    html += `<div class="upcoming-row" data-tid="${t.id}">
            <span class="up-side" style="background:${bar}"></span>
            <div class="up-info">
                <span class="up-name">${esc(t.title)}</span>
                <span class="up-date">${fmtDate(t.dateDeadline)}</span>
            </div>
            <span class="up-badge ${cls}">${lbl}</span>
        </div>`
  })

  html += `</div>`
  container.innerHTML = html

  // Al hacer clic en una tarea del calendario, abre su modal de detalle
  container.querySelectorAll("[data-tid]").forEach((el) => {
    el.addEventListener("click", () => {
      const t = state.tasks.find((x) => x.id === parseInt(el.dataset.tid))
      if (t) openTaskModal(t)
    })
  })
}

/* ════════════════════════════════════════════════
   EVENTOS GLOBALES
   Registra todos los listeners de la página que no dependen de datos dinámicos
════════════════════════════════════════════════ */
function bindEvents() {
  // Sidebar: crear proyecto y buscador
  document.getElementById("btn-new-project").addEventListener("click", () => openProjectModal(null))
  document.getElementById("btn-empty-create").addEventListener("click", () => openProjectModal(null))
  document.getElementById("sidebar-search").addEventListener("input", () => renderSidebar())

  // Cabecera del proyecto: renombrar y eliminar
  document.getElementById("btn-rename-proj").addEventListener("click", () => {
    if (state.currentProject) openProjectModal(state.currentProject)
  })
  document.getElementById("btn-delete-proj").addEventListener("click", () => {
    if (state.currentProject) handleDeleteProject(state.currentProject)
  })

  // Controles de tareas: crear, buscar
  document.getElementById("btn-add-task").addEventListener("click", () => openTaskModal(null))
  document.getElementById("task-search").addEventListener("input", (e) => {
    state.taskSearch = e.target.value.trim()
    renderKanban()
  })

  // Chips de filtro de tareas (Todas / Completadas / Expiradas / En curso)
  document.querySelectorAll("#tasks-filters .filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Desactiva todos los chips y activa solo el pulsado
      document.querySelectorAll("#tasks-filters .filter-chip").forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")
      state.taskFilter = btn.dataset.filter
      renderKanban()
    })
  })

  // Pestañas (Tareas / Miembros / Calendario): activa la pestaña y su panel correspondiente
  document.querySelectorAll(".tab-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-pill").forEach((b) => b.classList.remove("active"))
      document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"))
      btn.classList.add("active")
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active")
    })
  })

  // Cierre de modales mediante botones de cerrar y cancelar
  document.getElementById("modal-proj-close").addEventListener("click", () => closeModal("modal-project"))
  document.getElementById("modal-proj-cancel").addEventListener("click", () => closeModal("modal-project"))
  document.getElementById("modal-task-close").addEventListener("click", () => closeModal("modal-task"))
  document.getElementById("modal-task-cancel").addEventListener("click", () => closeModal("modal-task"))
  document.getElementById("modal-confirm-close").addEventListener("click", () => closeModal("modal-confirm"))
  document.getElementById("modal-confirm-cancel").addEventListener("click", () => closeModal("modal-confirm"))

  // Botón de confirmar en el diálogo de confirmación: ejecuta el callback guardado en el estado
  document.getElementById("btn-confirm-delete").addEventListener("click", () => {
    if (state.confirmCb) {
      state.confirmCb()
      state.confirmCb = null
    }
    closeModal("modal-confirm")
  })

  // Botón "Inicio": vuelve a la pantalla principal limpiando el proyecto activo
  document.getElementById("btn-go-home")?.addEventListener("click", clearLastProject)

  // Cierra el modal al hacer clic en el fondo oscuro (overlay), pero no en la tarjeta del modal
  document.querySelectorAll(".modal-overlay").forEach((ov) =>
    ov.addEventListener("click", (e) => {
      if (e.target === ov) closeModal(ov.id)
    }),
  )

  // Cierra cualquier modal abierto al pulsar la tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") ["modal-project", "modal-task", "modal-confirm"].forEach(closeModal)
  })
}

// Inicializa las instancias de los tres custom selects de la página.
// Solo los crea si el elemento existe en el DOM y aún no fueron instanciados.
function initCustomSelects() {
  const sortEl = document.getElementById("task-sort-select")
  const roleEl = document.getElementById("member-role-select")
  const assigneeEl = document.getElementById("assignee-select")

  // csSort: ordenar tareas. Al cambiar, actualiza el estado y redibuja el kanban
  if (sortEl && !csSort)
    csSort = new CustomSelect(sortEl, (val) => {
      state.taskSort = val
      renderKanban()
    })
  // csRole: elegir el rol al invitar un nuevo miembro
  if (roleEl && !csRole) csRole = new CustomSelect(roleEl)
  // csAssignee: asignar un responsable a una tarea
  if (assigneeEl && !csAssignee) csAssignee = new CustomSelect(assigneeEl)
}

/* ── Arranque de la aplicación ────────────────────────────────────── */
// Se ejecuta cuando el HTML está completamente cargado (DOMContentLoaded)
document.addEventListener("DOMContentLoaded", async () => {
  if (!loadUser()) return // Si no hay sesión válida, para aquí (loadUser redirige al login)
  bindEvents() // Registra todos los listeners de la página
  initCustomSelects() // Inicializa los componentes de select personalizado
  initInvitePanel() // Inicializa el panel de búsqueda de usuarios
  await loadProjects() // Carga los proyectos del usuario desde el backend
})
