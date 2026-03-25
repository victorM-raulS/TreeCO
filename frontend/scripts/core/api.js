const BASE_URL = "https://treecobackend.onrender.com"

import { getUser } from "./session.js"

export function requireAuth() {
  if (!getUser()) {
    location.replace("index.html")
  }
}

function buildUrl(path, query = {}) {
  const url = new URL(`${BASE_URL}${path}`)

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, value)
    }
  })

  return url.toString()
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")

  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const errorMessage = (isJson && data?.error) || (isJson && data?.message) || `Error HTTP ${response.status}`

    const error = new Error(errorMessage)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

async function request(path, options = {}, query = {}) {
  const url = buildUrl(path, query)

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  }

  if (config.body === undefined) {
    delete config.body
  }

  const response = await fetch(url, config)
  return parseResponse(response)
}

function get(path, query) {
  return request(path, { method: "GET" }, query)
}

function post(path, body, query) {
  return request(
    path,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    query,
  )
}

function put(path, body, query) {
  return request(
    path,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    query,
  )
}

function patch(path, body, query) {
  return request(
    path,
    {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    query,
  )
}

function del(path, query) {
  return request(path, { method: "DELETE" }, query)
}

// ======================================================
// AUTH API
// ======================================================

export const authApi = {
  sendRegisterCode({ username, email, password }) {
    return post("/auth/register/send-code", { username, email, password })
  },

  confirmRegister({ email, code }) {
    return post("/auth/register/confirm", { email, code })
  },

  resendRegisterCode(email) {
    return post("/auth/register/resend-code", { email })
  },

  login({ email, password }) {
    return post("/auth/login", { email, password })
  },

  requestPasswordReset(email) {
    return post("/auth/password-reset/request", { email })
  },

  validateResetToken(code) {
    return post("/auth/password-reset/validate", { code })
  },

  confirmPasswordReset({ code, newPassword }) {
    return post("/auth/password-reset/confirm", { code, newPassword })
  },
}

// ======================================================
// USERS API
// ======================================================

export const usersApi = {
  getAll() {
    return get("/api/users")
  },

  getById(id) {
    return get(`/api/users/${id}`)
  },

  update(id, { username, email }) {
    return put(`/api/users/${id}`, { username, email })
  },

  changePassword(id, { oldPassword, newPassword }) {
    return put(`/api/users/${id}/password`, { oldPassword, newPassword })
  },

  delete(id) {
    return del(`/api/users/${id}`)
  },

  getProjects(id) {
    return get(`/api/users/${id}/projects`)
  },

  getTasks(id) {
    return get(`/api/users/${id}/tasks`)
  },

  getStats(id) {
    return get(`/api/users/${id}/stats`)
  },

  getProfile(id) {
    return get(`/api/users/${id}/profile`)
  },
}

// ======================================================
// NOTIFICATIONS API
// ======================================================

export const notificationsApi = {
  getAll(userId, filters = {}) {
    return get(`/api/users/${userId}/notifications`, filters)
  },

  countUnread(userId) {
    return get(`/api/users/${userId}/notifications/count`)
  },

  markAsRead(userId, notificationId) {
    return patch(`/api/users/${userId}/notifications/${notificationId}/read`)
  },

  markAsUnread(userId, notificationId) {
    return patch(`/api/users/${userId}/notifications/${notificationId}/unread`)
  },

  markAllAsRead(userId) {
    return patch(`/api/users/${userId}/notifications/read-all`)
  },

  delete(userId, notificationId) {
    return del(`/api/users/${userId}/notifications/${notificationId}`)
  },

  deleteAllRead(userId) {
    return del(`/api/users/${userId}/notifications/read`)
  },
}

// ======================================================
// PROJECTS API
// ======================================================

export const projectsApi = {
  getAll() {
    return get("/projects")
  },

  getByUser(userId) {
    return get("/projects", { userId })
  },

  getById(id) {
    return get(`/projects/${id}`)
  },

  create({ name, description, userId }) {
    return post("/projects", { name, description, userId })
  },

  update(id, { name, description }) {
    // OJO: en tu controller es PATCH, no PUT
    return patch(`/projects/${id}`, { name, description })
  },

  delete(id) {
    return del(`/projects/${id}`)
  },

  getProgress(id) {
    return get(`/projects/${id}/progress`)
  },
}

// ======================================================
// PROJECT MEMBERS API
// ======================================================

export const projectMembersApi = {
  getAll(projectId, role) {
    const query = role ? { role } : {}
    return get(`/projects/${projectId}/members`, query)
  },

  count(projectId) {
    return get(`/projects/${projectId}/members/count`)
  },

  add(projectId, { userId, role, invitedByUserId }) {
    return post(`/projects/${projectId}/members`, {
      userId,
      role,
      invitedByUserId,
    })
  },

  changeRole(projectId, userId, newRole) {
    return patch(`/projects/${projectId}/members/${userId}/role`, {
      newRole,
    })
  },

  transferOwnership(projectId, { currentOwnerId, newOwnerId }) {
    return patch(`/projects/${projectId}/members/transfer-ownership`, {
      currentOwnerId,
      newOwnerId,
    })
  },

  remove(projectId, userId) {
    return del(`/projects/${projectId}/members/${userId}`)
  },
}

// ======================================================
// TASKS API
// ======================================================

export const tasksApi = {
  getAll(projectId, filters = {}) {
    // { state: "TODO", priority: "HIGH", orderByDate: true }
    return get(`/projects/${projectId}/tasks`, filters)
  },

  getById(projectId, taskId) {
    return get(`/projects/${projectId}/tasks/${taskId}`)
  },

  create(projectId, { title, description, dateDeadline }) {
    return post(`/projects/${projectId}/tasks`, {
      title,
      description,
      dateDeadline,
    })
  },

  update(projectId, taskId, { title, description, dateDeadline, completed }) {
    return patch(`/projects/${projectId}/tasks/${taskId}`, {
      title,
      description,
      dateDeadline,
      completed,
    })
  },

  delete(projectId, taskId) {
    return del(`/projects/${projectId}/tasks/${taskId}`)
  },
}

// ======================================================
// DEV API
// ======================================================

export const devApi = {
  resetDatabase() {
    return del("/dev/reset")
  },
}

// ======================================================
// API agrupada
// ======================================================

export const api = {
  auth: authApi,
  users: usersApi,
  notifications: notificationsApi,
  projects: projectsApi,
  projectMembers: projectMembersApi,
  tasks: tasksApi,
  dev: devApi,
}

export default api
