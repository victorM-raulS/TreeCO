/* ═══════════════════════════════════════════════
   TREECO — Calendar JS  v6
   ═══════════════════════════════════════════════ */

const API_BASE = "https://treecobackend.onrender.com"

const state = {
  currentDate: null,
  selectedDate: null,
  view: "month",
  tasks: [],
  projects: [],
  projectId: "",
  user: null,
  modalFilter: "all",
  modalTasks: [],
  pickerYear: new Date().getFullYear(),
  pickerMonth: null, // mes seleccionado en picker (pendiente de aplicar)
}

let ui = {}

function initUI() {
  const getById = (id) => document.getElementById(id)
  ui.grid = getById("cal-grid")
  ui.wdays = getById("cal-weekdays")
  ui.mname = getById("cal-month-name")
  ui.myear = getById("cal-year")
  ui.loading = getById("cal-loading")
  ui.prev = getById("cal-prev")
  ui.next = getById("cal-next")
  ui.btnToday = getById("btn-today")
  ui.vMonth = getById("view-month")
  ui.vWeek = getById("view-week")
  ui.projSel = getById("project-filter")
  ui.titleBtn = getById("cal-title-btn")
  ui.miniGrid = getById("mini-grid")
  ui.miniLbl = getById("mini-month-label")
  ui.miniPrev = getById("mini-prev")
  ui.miniNext = getById("mini-next")
  ui.miniLblBtn = getById("mini-month-label-btn")
  ui.upList = getById("upcoming-list")
  ui.pickerBd = getById("picker-backdrop")
  ui.pickerMos = getById("picker-months")
  ui.pyInput = getById("picker-year-input")
  ui.pyPrev = getById("picker-year-prev")
  ui.pyNext = getById("picker-year-next")
  ui.pickerClose = getById("picker-close-btn")
  ui.pickerToday = getById("picker-today-btn")
  ui.pickerCancel = getById("picker-cancel-btn")
  ui.pickerApply = getById("picker-apply-btn")
  ui.mOverlay = getById("day-modal-backdrop")
  ui.mDate = getById("modal-date-title")
  ui.mList = getById("modal-tasks-list")
  ui.mClose = getById("modal-close")
  ui.addBtn = getById("btn-add-task")
  ui.mStats = getById("modal-day-stats")
  ui.mFilters = document.querySelector(".modal-filters")
  ui.search = getById("task-search")
  ui.sResults = getById("search-results")
  ui.navAvatar = getById("nav-avatar")
  ui.navName = getById("nav-name")
  ui.navRole = getById("nav-role")
  ui.toasts = getById("toast-container")
}

/* ══════════════════════════════════════════════════
				 INIT
			══════════════════════════════════════════════════ */
async function init() {
  initUI()

  const now = new Date()
  state.currentDate = new Date(now.getFullYear(), now.getMonth(), 1)
  state.pickerYear = now.getFullYear()

  try {
    const raw = localStorage.getItem("treeco_user")
    if (raw) {
      state.user = JSON.parse(raw)
      if (ui.navName) ui.navName.textContent = state.user.username || state.user.email || "Usuario"
      if (ui.navRole) ui.navRole.textContent = state.user.role || "Rol"
      if (ui.navAvatar && state.user.avatarUrl) ui.navAvatar.src = state.user.avatarUrl
    }
  } catch (exception) {
    console.warn("user:", exception)
  }

  // Leer projectId desde URL si viene de projects.html
  const urlParams = new URLSearchParams(window.location.search)
  const urlProjectId = urlParams.get("projectId")
  if (urlProjectId) {
    state.projectId = urlProjectId
  }

  bindEvents()
  render()

  await loadProjects()

  // Aplicar filtro de proyecto en el select si vino por URL
  if (state.projectId && ui.projSel) {
    ui.projSel.value = state.projectId
  }

  await loadTasks()
  render()
}

/* ══════════════════════════════════════════════════
				 API
			══════════════════════════════════════════════════ */
async function loadProjects() {
  try {
    const uid = state.user?.userId
    if (!uid) {
      console.warn("No hay usuario autenticado, redirigiendo…")
      location.replace("index.html")
      return
    }
    const res = await fetch(`${API_BASE}/projects?userId=${uid}`)
    if (!res.ok) return
    state.projects = await res.json()
    fillProjectSelect()
  } catch (exception) {
    console.warn("projects:", exception)
  }
}

async function loadTasks() {
  setLoading(true)
  state.tasks = []
  try {
    const myId = state.user?.userId || state.user?.id
    const myIdNum = Number(myId)

    let projectsToLoad = []

    if (state.projectId) {
      projectsToLoad = [{ id: Number(state.projectId), name: "" }]
      const found = state.projects.find((p) => String(p.id) === String(state.projectId))
      if (found) projectsToLoad = [found]
    } else {
      projectsToLoad = state.projects
    }

    const settled = await Promise.allSettled(
      projectsToLoad.map(async (p) => {
        const res = await fetch(`${API_BASE}/projects/${p.id}/tasks`)
        if (!res.ok) return []
        // Parseo seguro — captura JSON malformado
        try {
          return await res.json()
        } catch (parseErr) {
          console.error(`JSON inválido en proyecto ${p.id}:`, parseErr)
          toast("Error leyendo tareas del servidor. ¿Está aplicado TaskController.java?", "err")
          return []
        }
      }),
    )

    settled.forEach((r, i) => {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        r.value.forEach((t) => {
          t._pName = projectsToLoad[i].name || ""
          t._pId = projectsToLoad[i].id
        })
        const filtered = r.value.filter((t) => {
          if (!t.assignedTo) return false
          return Number(t.assignedTo.id) === myIdNum
        })
        state.tasks.push(...filtered)
      }
    })
  } catch (e) {
    console.error("loadTasks error:", e)
    toast("Error cargando tareas", "err")
  } finally {
    setLoading(false)
  }
}

async function patchTask(task, patch) {
  try {
    const res = await fetch(`${API_BASE}/projects/${task._pId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw 0
    Object.assign(task, patch)
    return true
  } catch {
    toast("No se pudo actualizar", "err")
    return false
  }
}

/* ══════════════════════════════════════════════════
				 RENDER
			══════════════════════════════════════════════════ */
function render() {
  // renderWeek actualiza state.currentDate primero — mini cal debe ir después
  state.view === "month" ? renderMonth() : renderWeek()
  updateTitle()
  renderMiniCal()
  renderUpcoming()
}

function updateTitle() {
  ui.mname.textContent = cap(getMonthName(state.currentDate))
  ui.myear.textContent = state.currentDate.getFullYear()
}

function renderMonth() {
  ui.grid.innerHTML = ""
  ui.grid.className = "cal-grid"
  ui.wdays.innerHTML = "<span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>"

  const year = state.currentDate.getFullYear()
  const month = state.currentDate.getMonth()
  const dayOffset = (new Date(year, month, 1).getDay() + 6) % 7

  const taskHeatmap = {}
  state.tasks.forEach((t) => {
    const dl = parseDL(t)
    if (dl && dl.getFullYear() === year && dl.getMonth() === month) taskHeatmap[dl.getDate()] = (taskHeatmap[dl.getDate()] || 0) + 1
  })
  const maxHeat = Math.max(1, ...Object.values(taskHeatmap))

  for (let i = dayOffset - 1; i >= 0; i--) ui.grid.appendChild(mkCell(new Date(year, month, -i), true, 0, 1))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) ui.grid.appendChild(mkCell(new Date(year, month, d), false, taskHeatmap[d] || 0, maxHeat))
  const total = dayOffset + daysInMonth
  const cols = Math.ceil(total / 7) * 7
  for (let i = 1; i <= cols - total; i++) ui.grid.appendChild(mkCell(new Date(year, month + 1, i), true, 0, 1))
}

function renderWeek() {
  ui.grid.innerHTML = ""
  ui.grid.className = "cal-grid week-view"

  const anchor = state.selectedDate ? new Date(state.selectedDate) : new Date()
  const dayOffset = (anchor.getDay() + 6) % 7
  const mondayDate = new Date(anchor)
  mondayDate.setDate(anchor.getDate() - dayOffset)

  const LBL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
  ui.wdays.innerHTML = ""
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate)
    d.setDate(mondayDate.getDate() + i)
    const isTodayWeek = isSameDay(d, new Date())
    const sp = document.createElement("span")
    sp.style.cssText = "line-height:1.5;display:flex;flex-direction:column;align-items:center;gap:2px"
    sp.innerHTML = `<span>${LBL[i]}</span><span style="font-family:var(--font-mono);font-size:.85rem;${isTodayWeek ? "color:var(--color-text-accent);font-weight:700" : "color:rgba(255,255,255,.3)"}">${d.getDate()}</span>`
    ui.wdays.appendChild(sp)
  }

  state.currentDate = new Date(anchor.getFullYear(), anchor.getMonth(), 1) // mes del día seleccionado, no del lunes
  updateTitle()

  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate)
    d.setDate(mondayDate.getDate() + i)
    const weekDayTaskCount = tasksFor(d).length
    ui.grid.appendChild(mkCell(d, false, weekDayTaskCount, Math.max(1, weekDayTaskCount)))
  }
}

function mkCell(date, ghost, taskCount, maxTaskCount) {
  const tasks = tasksFor(date)
  const isToday = isSameDay(date, new Date())
  const isSelected = isSameDay(date, state.selectedDate)

  let heatClass = ""
  if (!ghost && taskCount > 0) {
    const r = taskCount / maxTaskCount
    heatClass = r >= 0.75 ? "h4" : r >= 0.5 ? "h3" : r >= 0.25 ? "h2" : "h1"
  }

  const cell = document.createElement("div")
  cell.className = ["cal-day", ghost ? "other-month" : "", isToday ? "today" : "", isSelected ? "selected" : "", heatClass].filter(Boolean).join(" ")

  const headerEl = document.createElement("div")
  headerEl.className = "day-hdr"
  const dayNumberEl = document.createElement("div")
  dayNumberEl.className = "day-num"
  dayNumberEl.textContent = date.getDate()
  headerEl.appendChild(dayNumberEl)
  if (tasks.length) {
    const taskCountBadge = document.createElement("span")
    taskCountBadge.className = "day-cnt"
    taskCountBadge.textContent = tasks.length
    headerEl.appendChild(taskCountBadge)
  }
  cell.appendChild(headerEl)

  const tasksWrapper = document.createElement("div")
  tasksWrapper.className = "day-tasks"
  const maxVisible = state.view === "week" ? 8 : 3
  tasks.slice(0, maxVisible).forEach((t) => {
    const st = tState(t)
    const badgeClass = st === "done" ? "p-done" : st === "exp" ? "p-exp" : "p-" + (t.priority || "MID")
    const pill = document.createElement("div")
    pill.className = `tpill ${badgeClass}`
    pill.innerHTML = `<span class="tpill-dot"></span><span class="tpill-txt">${esc(t.title)}</span>`
    pill.addEventListener("click", (e) => {
      e.stopPropagation()
      openModal(date)
    })
    tasksWrapper.appendChild(pill)
  })
  if (tasks.length > maxVisible) {
    const m = document.createElement("div")
    m.className = "day-more"
    m.textContent = `+${tasks.length - maxVisible} más`
    m.addEventListener("click", (e) => {
      e.stopPropagation()
      openModal(date)
    })
    tasksWrapper.appendChild(m)
  }
  cell.appendChild(tasksWrapper)

  cell.addEventListener("click", () => {
    state.selectedDate = date
    document.querySelectorAll(".cal-day.selected,.mini-day.selected").forEach((el) => el.classList.remove("selected"))
    cell.classList.add("selected")
    renderMiniCal()
    openModal(date)
  })

  return cell
}

/* ══════════════════════════════════════════════════
				 MINI CAL
			══════════════════════════════════════════════════ */
function renderMiniCal() {
  const year = state.currentDate.getFullYear()
  const month = state.currentDate.getMonth()
  ui.miniLbl.textContent = cap(getMonthName(state.currentDate)) + " " + year
  ui.miniGrid.innerHTML = ""

  const dayOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let i = dayOffset - 1; i >= 0; i--) mkMiniDay(new Date(year, month, -i), true)
  for (let d = 1; d <= daysInMonth; d++) mkMiniDay(new Date(year, month, d), false)
  const total = dayOffset + daysInMonth
  for (let i = 1; i <= Math.ceil(total / 7) * 7 - total; i++) mkMiniDay(new Date(year, month + 1, i), true)
}

function mkMiniDay(date, ghost) {
  const el = document.createElement("div")
  el.className = ["mini-day", ghost ? "other-month" : "", isSameDay(date, new Date()) ? "today" : "", isSameDay(date, state.selectedDate) ? "selected" : "", tasksFor(date).length ? "has-tasks" : ""].filter(Boolean).join(" ")
  el.textContent = date.getDate()
  el.addEventListener("click", () => {
    state.selectedDate = date
    state.currentDate = new Date(date.getFullYear(), date.getMonth(), 1)
    render()
    openModal(date)
  })
  ui.miniGrid.appendChild(el)
}

/* ══════════════════════════════════════════════════
				 UPCOMING
			══════════════════════════════════════════════════ */
function renderUpcoming() {
  const now = today()
  const end = new Date(now)
  end.setDate(now.getDate() + 7)
  const list = state.tasks
    .filter((t) => {
      if (t.completed) return false
      const dl = parseDL(t)
      return dl && dl >= now && dl <= end
    })
    .sort((a, b) => parseDL(a) - parseDL(b))
    .slice(0, 8)

  ui.upList.innerHTML = ""
  if (!list.length) {
    ui.upList.innerHTML = `<span class="empty-msg">Sin vencimientos esta semana 🌿</span>`
    return
  }
  list.forEach((t) => {
    const daysLeft = daysUntil(t)
    const badgeText = daysLeft === 0 ? "Hoy" : daysLeft === 1 ? "Mañana" : `${daysLeft}d`
    const badgeClass = daysLeft === 0 ? "badge-today" : daysLeft <= 2 ? "badge-soon" : "badge-normal"
    const priorityColor = { HIGH: "rgba(255,100,100,.75)", MID: "rgba(251,191,36,.75)", LOW: "rgba(61,220,132,.75)" }[t.priority] || "rgba(251,191,36,.75)"
    const el = document.createElement("div")
    el.className = "up-item"
    el.innerHTML = `
						<span class="up-bar" style="background:${priorityColor}"></span>
						<div class="up-info">
							<span class="up-title">${esc(t.title)}</span>
							<span class="up-proj">${esc(t._pName || "")}</span>
						</div>
						<span class="up-badge ${badgeClass}">${badgeText}</span>`
    el.addEventListener("click", () => {
      const dl = parseDL(t)
      if (!dl) return
      state.selectedDate = dl
      state.currentDate = new Date(dl.getFullYear(), dl.getMonth(), 1)
      render()
      openModal(dl)
    })
    ui.upList.appendChild(el)
  })
}

/* ══════════════════════════════════════════════════
				 MODAL DÍA
			══════════════════════════════════════════════════ */
function openModal(date) {
  state.selectedDate = date
  state.modalTasks = tasksFor(date)
  state.modalFilter = "all"
  ui.mFilters.querySelectorAll(".mf").forEach((b) => b.classList.toggle("active", b.dataset.filter === "all"))
  ui.mDate.textContent = formatFull(date)
  renderModalStats()
  renderModalTasks()
  ui.mOverlay.classList.add("open")
}

function renderModalStats() {
  const now = today()
  const counts = { HIGH: 0, MID: 0, LOW: 0, done: 0, exp: 0 }
  state.modalTasks.forEach((t) => {
    if (t.completed) {
      counts.done++
      return
    }
    const dl = parseDL(t)
    if (dl && dl < now) {
      counts.exp++
      return
    }
    counts[t.priority || "MID"]++
  })
  ui.mStats.innerHTML = [counts.HIGH ? `<span class="mds-chip mds-high">${counts.HIGH} ↑</span>` : "", counts.MID ? `<span class="mds-chip mds-mid">${counts.MID} —</span>` : "", counts.LOW ? `<span class="mds-chip mds-low">${counts.LOW} ↓</span>` : "", counts.done ? `<span class="mds-chip mds-done">${counts.done} ✓</span>` : "", counts.exp ? `<span class="mds-chip mds-exp">${counts.exp} !</span>` : ""].join("")
}

function renderModalTasks() {
  const filter = state.modalFilter
  const list = state.modalTasks.filter((t) => (filter === "all" ? true : filter === "completed" ? t.completed : !t.completed))
  ui.mList.innerHTML = ""
  if (!list.length) {
    ui.mList.innerHTML = `<div class="m-empty"><span class="m-empty-icon">📭</span>Sin tareas aquí</div>`
    return
  }
  list.forEach((t) => {
    const st = tState(t)
    const taskClass = st === "done" ? "t-done" : st === "exp" ? "t-exp" : "t-" + (t.priority || "MID")
    const priorityTag = prioTag(t.priority, st)
    const el = document.createElement("div")
    el.className = `m-task ${taskClass}`
    el.innerHTML = `
						<div class="m-bar"></div>
						<div class="m-body">
							<div class="m-title">${esc(t.title)}</div>
							${t.description ? `<div class="m-desc">${esc(t.description)}</div>` : ""}
							<div class="m-meta">
								<span class="m-tag ${priorityTag.cls}">${priorityTag.lbl}</span>
								${t._pName ? `<span class="m-tag tag-proj">${esc(t._pName)}</span>` : ""}
							</div>
						</div>
						<div class="m-check">
							<svg width="8" height="8" viewBox="0 0 10 10" fill="none">
								<path d="M1.5 5L4 7.5L8.5 2.5" stroke="#3ddc84" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</div>`
    el.querySelector(".m-check").addEventListener("click", async (e) => {
      e.stopPropagation()
      const ok = await patchTask(t, { completed: !t.completed })
      if (ok) {
        toast(t.completed ? "Tarea completada ✓" : "Tarea reabierta", "ok")
        renderUpcoming()
        state.view === "month" ? renderMonth() : renderWeek()
        renderMiniCal()
        renderModalStats()
        renderModalTasks()
      }
    })
    ui.mList.appendChild(el)
  })
}

function closeModal() {
  ui.mOverlay.classList.remove("open")
}

/* ══════════════════════════════════════════════════
				 PICKER
			══════════════════════════════════════════════════ */
const MES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const MES_FULL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

function openPicker() {
  // Guardar estado previo para poder cancelar
  state.pickerYear = state.currentDate.getFullYear()
  state.pickerMonth = state.currentDate.getMonth()
  ui.pyInput.value = state.pickerYear
  renderPickerMonths()
  ui.pickerBd.classList.add("open")
  setTimeout(() => ui.pyInput.focus(), 80)
}

function closePicker() {
  ui.pickerBd.classList.remove("open")
}

function applyPicker() {
  if (state.pickerMonth === null) return
  state.currentDate = new Date(state.pickerYear, state.pickerMonth, 1)
  closePicker()
  render()
}

function renderPickerMonths() {
  ui.pyInput.value = state.pickerYear
  ui.pickerMos.innerHTML = ""
  const todayYear = new Date().getFullYear(),
    todayMonth = new Date().getMonth()
  MES_SHORT.forEach((m, i) => {
    const btn = document.createElement("button")
    btn.className = "pm-btn"
    btn.title = MES_FULL[i]
    btn.textContent = m
    // Mes de hoy real
    if (state.pickerYear === todayYear && i === todayMonth) btn.classList.add("is-today")
    // Mes actualmente en el calendario (origen)
    if (state.pickerYear === state.currentDate.getFullYear() && i === state.currentDate.getMonth()) btn.classList.add("is-origin")
    // Mes seleccionado pendiente de aplicar
    if (state.pickerYear === state.pickerYear && i === state.pickerMonth && state.pickerYear === state.pickerYear) {
      if (state.pickerMonth === i) btn.classList.add("is-active")
    }
    btn.addEventListener("click", () => {
      state.pickerMonth = i
      ui.pickerMos.querySelectorAll(".pm-btn").forEach((b) => b.classList.remove("is-active"))
      btn.classList.add("is-active")
    })
    // Doble clic aplica directamente
    btn.addEventListener("dblclick", applyPicker)
    ui.pickerMos.appendChild(btn)
  })
}

/* ══════════════════════════════════════════════════
				 BÚSQUEDA
			══════════════════════════════════════════════════ */
function doSearch(q) {
  if (!q || q.length < 2) {
    ui.sResults.classList.remove("open")
    return
  }
  const queryLower = q.toLowerCase()
  const searchResults = state.tasks.filter((t) => t.title.toLowerCase().includes(queryLower) || (t.description || "").toLowerCase().includes(queryLower)).slice(0, 7)

  ui.sResults.innerHTML = ""
  if (!searchResults.length) {
    ui.sResults.innerHTML = `<div class="sr-item"><span class="sr-title" style="color:var(--color-text-muted)">Sin resultados</span></div>`
    ui.sResults.classList.add("open")
    return
  }
  const PRIORITY_COLORS = { HIGH: "#ff6464", MID: "#fbbf24", LOW: "#3ddc84" }
  searchResults.forEach((t) => {
    const dl = parseDL(t)
    const el = document.createElement("div")
    el.className = "sr-item"
    el.innerHTML = `
						<span class="sr-dot" style="background:${PRIORITY_COLORS[t.priority] || "#fbbf24"}"></span>
						<span class="sr-title">${esc(t.title)}</span>
						${dl ? `<span class="sr-date">${fmtShort(dl)}</span>` : ""}`
    el.addEventListener("click", () => {
      if (!dl) return
      state.selectedDate = dl
      state.currentDate = new Date(dl.getFullYear(), dl.getMonth(), 1)
      ui.search.value = ""
      ui.sResults.classList.remove("open")
      render()
      openModal(dl)
    })
    ui.sResults.appendChild(el)
  })
  ui.sResults.classList.add("open")
}

/* ══════════════════════════════════════════════════
				 EVENTOS
			══════════════════════════════════════════════════ */
function bindEvents() {
  ui.prev.addEventListener("click", () => navigate(-1))
  ui.next.addEventListener("click", () => navigate(+1))
  ui.btnToday.addEventListener("click", goToday)
  ui.miniPrev.addEventListener("click", () => navigate(-1))
  ui.miniNext.addEventListener("click", () => navigate(+1))
  ui.miniLblBtn.addEventListener("click", openPicker)
  ui.titleBtn.addEventListener("click", openPicker)
  ui.pickerBd.addEventListener("click", (e) => {
    if (e.target === ui.pickerBd) closePicker()
  })
  ui.pickerClose.addEventListener("click", closePicker)
  ui.pickerCancel.addEventListener("click", closePicker)
  ui.pickerToday.addEventListener("click", () => {
    const n = new Date()
    state.pickerYear = n.getFullYear()
    state.pickerMonth = n.getMonth()
    applyPicker()
  })
  ui.pickerApply.addEventListener("click", applyPicker)
  // Enter en cualquier punto del picker aplica
  ui.pickerBd.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      applyPicker()
    }
  })
  ui.pyPrev.addEventListener("click", () => {
    state.pickerYear--
    renderPickerMonths()
  })
  ui.pyNext.addEventListener("click", () => {
    state.pickerYear++
    renderPickerMonths()
  })
  ui.pyInput.addEventListener("input", () => {
    const y = parseInt(ui.pyInput.value, 10)
    if (y >= 2000 && y <= 2099) {
      state.pickerYear = y
      renderPickerMonths()
    }
  })
  ui.pyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      applyPicker()
    }
    if (e.key === "Escape") {
      closePicker()
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      state.pickerYear++
      renderPickerMonths()
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      state.pickerYear--
      renderPickerMonths()
    }
  })
  ui.vMonth.addEventListener("click", () => setView("month"))
  ui.vWeek.addEventListener("click", () => setView("week"))
  ui.projSel.addEventListener("change", async () => {
    state.projectId = ui.projSel.value
    await loadTasks()
    render()
  })
  ui.mClose.addEventListener("click", closeModal)
  ui.mOverlay.addEventListener("click", (e) => {
    if (e.target === ui.mOverlay) closeModal()
  })
  ui.addBtn.addEventListener("click", () => toast("Próximamente: crear tarea 🚀", "ok"))
  ui.mFilters.addEventListener("click", (e) => {
    const b = e.target.closest(".mf")
    if (!b) return
    ui.mFilters.querySelectorAll(".mf").forEach((x) => x.classList.remove("active"))
    b.classList.add("active")
    state.modalFilter = b.dataset.filter
    renderModalTasks()
  })
  ui.search.addEventListener("input", () => doSearch(ui.search.value.trim()))
  ui.search.addEventListener("blur", () => setTimeout(() => ui.sResults.classList.remove("open"), 180))

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName?.toUpperCase()
    const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA"
    if (e.key === "Escape") {
      if (ui.mOverlay.classList.contains("open")) {
        closeModal()
        return
      }
      if (ui.pickerBd.classList.contains("open")) {
        closePicker()
        return
      }
    }
    if (typing) return
    switch (e.key) {
      case "ArrowLeft":
        navigate(-1)
        break
      case "ArrowRight":
        navigate(+1)
        break
      case "ArrowUp":
        navigateY(1)
        break
      case "ArrowDown":
        navigateY(-1)
        break
      case "t":
      case "T":
        goToday()
        break
      case "m":
      case "M":
        setView("month")
        break
      case "s":
      case "state":
        setView("week")
        break
      case "g":
      case "G":
        openPicker()
        break
      case "/":
        e.preventDefault()
        ui.search.focus()
        break
    }
  })
}

/* ══════════════════════════════════════════════════
				 NAVEGACIÓN
			══════════════════════════════════════════════════ */
function navigate(delta) {
  if (state.view === "month") {
    state.currentDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + delta, 1)
  } else {
    const anchorDate = state.selectedDate ? new Date(state.selectedDate) : new Date()
    anchorDate.setDate(anchorDate.getDate() + delta * 7)
    state.selectedDate = new Date(anchorDate)
  }
  render()
}

function navigateY(delta) {
  const d = new Date(state.currentDate)
  d.setFullYear(d.getFullYear() + delta)
  state.currentDate = d

  render()
}

function goToday() {
  const n = new Date()
  state.currentDate = new Date(n.getFullYear(), n.getMonth(), 1)
  state.selectedDate = n
  if (state.view !== "month") setView("month")
  else render()
}

function setView(v) {
  state.view = v
  ui.vMonth.classList.toggle("active", v === "month")
  ui.vWeek.classList.toggle("active", v === "week")
  render()
}

function fillProjectSelect() {
  ui.projSel.innerHTML = `<option value="">Todos los proyectos</option>`
  state.projects.forEach((p) => {
    const o = document.createElement("option")
    o.value = p.id
    o.textContent = p.name
    ui.projSel.appendChild(o)
  })
}

function setLoading(on) {
  ui.loading.classList.toggle("on", on)
  ui.grid.style.opacity = on ? ".4" : "1"
}

function toast(msg, type = "ok") {
  const el = document.createElement("div")
  el.className = `toast ${type}`
  el.innerHTML = `<span class="toast-dot"></span>${esc(msg)}`
  ui.toasts.appendChild(el)
  setTimeout(() => {
    el.classList.add("out")
    el.addEventListener("animationend", () => el.remove(), { once: true })
  }, 2600)
}

/* ══════════════════════════════════════════════════
				 UTILS
			══════════════════════════════════════════════════ */
function tasksFor(d) {
  const s = dateStr(d)
  return state.tasks.filter((t) => {
    const dl = t.dateDeadline || t.dueDate
    return dl && dl.substring(0, 10) === s
  })
}
function parseDL(t) {
  const s = t.dateDeadline || t.dueDate
  if (!s) return null
  const [y, m, d] = s.substring(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d)
}
function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function daysUntil(t) {
  const dl = parseDL(t)
  if (!dl) return null
  return Math.round((dl - today()) / 86400000)
}
function tState(t) {
  if (t.completed) return "done"
  const dl = parseDL(t)
  if (dl && dl < today()) return "exp"
  return "active"
}
function prioTag(p, st) {
  if (st === "done") return { lbl: "Hecha", cls: "tag-done" }
  if (st === "exp") return { lbl: "Vencida", cls: "tag-exp" }
  return { HIGH: { lbl: "Alta", cls: "tag-HIGH" }, MID: { lbl: "Media", cls: "tag-MID" }, LOW: { lbl: "Baja", cls: "tag-LOW" } }[p] || { lbl: "Media", cls: "tag-MID" }
}
function getMonthName(d) {
  return d.toLocaleDateString("es-ES", { month: "long" })
}
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function formatFull(d) {
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}
function fmtShort(d) {
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
}
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

document.addEventListener("DOMContentLoaded", init)
/* ═══════════════════════════════════════════════



/* ═══════════════════════════════════════════════
   MÓVIL — FAB + Drawer de próximas tareas
   ═══════════════════════════════════════════════ */
;(function () {
  const BREAK = 600

  const fab = document.getElementById("fab-toggle")
  const overlay = document.getElementById("sidebar-overlay")
  const drawer = document.getElementById("mobile-drawer")
  const drawerBody = document.getElementById("mobile-drawer-body")
  const drawerClose = document.getElementById("mobile-drawer-close")
  if (!fab || !overlay || !drawer || !drawerBody) return

  let isOpen = false

  const PRIO_COLOR = {
    HIGH: "rgba(255,100,100,0.85)",
    MID: "rgba(251,191,36,0.85)",
    LOW: "rgba(61,220,132,0.85)",
  }

  function renderDrawer() {
    drawerBody.innerHTML = ""
    const now = today()
    const end = new Date(now)
    end.setDate(now.getDate() + 14)

    const list = state.tasks
      .filter((t) => {
        if (t.completed) return false
        const dl = parseDL(t)
        return dl && dl >= now && dl <= end
      })
      .sort((a, b) => parseDL(a) - parseDL(b))

    if (!list.length) {
      drawerBody.innerHTML = `
        <div class="md-empty">
          <span class="md-empty-icon">🌿</span>
          Sin tareas en los próximos 14 días
        </div>`
      return
    }

    // Agrupar por fecha
    const groups = {}
    list.forEach((t) => {
      const key = dateStr(parseDL(t))
      if (!groups[key]) groups[key] = { dl: parseDL(t), tasks: [] }
      groups[key].tasks.push(t)
    })

    Object.values(groups).forEach(({ dl, tasks }) => {
      const dLeft = Math.round((dl - now) / 86400000)
      let label
      if (dLeft === 0) label = "Hoy"
      else if (dLeft === 1) label = "Mañana"
      else
        label = cap(
          dl.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "short",
          }),
        )

      const sep = document.createElement("span")
      sep.className = "md-date-sep"
      sep.textContent = label
      drawerBody.appendChild(sep)

      tasks.forEach((t) => {
        const d = Math.round((parseDL(t) - now) / 86400000)
        let cls, txt
        if (d === 0) {
          cls = "md-badge-today"
          txt = "Hoy"
        } else if (d === 1) {
          cls = "md-badge-tmrw"
          txt = "Mañana"
        } else if (d <= 3) {
          cls = "md-badge-urgent"
          txt = `${d}d`
        } else {
          cls = "md-badge-soon"
          txt = `${d}d`
        }

        const color = PRIO_COLOR[t.priority] || PRIO_COLOR.MID
        const el = document.createElement("div")
        el.className = "md-task-item"
        el.innerHTML = `
          <div class="md-task-bar" style="background:${color}"></div>
          <div class="md-task-info">
            <span class="md-task-title">${esc(t.title)}</span>
            <span class="md-task-sub">${esc(t._pName || "")}</span>
          </div>
          <span class="md-task-badge ${cls}">${txt}</span>`
        el.addEventListener("click", () => {
          const dl = parseDL(t)
          if (!dl) return
          state.selectedDate = dl
          state.currentDate = new Date(dl.getFullYear(), dl.getMonth(), 1)
          close()
          render()
          openModal(dl)
        })
        drawerBody.appendChild(el)
      })
    })
  }

  function open() {
    if (window.innerWidth > BREAK) return
    isOpen = true
    renderDrawer()
    drawer.classList.add("is-open")
    overlay.classList.add("is-visible")
    fab.classList.add("is-open")
    document.body.style.overflow = "hidden"
  }

  function close() {
    isOpen = false
    drawer.classList.remove("is-open")
    overlay.classList.remove("is-visible")
    fab.classList.remove("is-open")
    document.body.style.overflow = ""
  }

  fab.addEventListener("click", () => (isOpen ? close() : open()))
  overlay.addEventListener("click", close)
  if (drawerClose) drawerClose.addEventListener("click", close)

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close()
  })

  // Swipe-down cierra el drawer
  let y0 = 0
  drawer.addEventListener(
    "touchstart",
    (e) => {
      y0 = e.touches[0].clientY
    },
    { passive: true },
  )
  drawer.addEventListener(
    "touchend",
    (e) => {
      if (e.changedTouches[0].clientY - y0 > 55) close()
    },
    { passive: true },
  )

  window.addEventListener("resize", () => {
    if (window.innerWidth > BREAK && isOpen) close()
  })
})()
