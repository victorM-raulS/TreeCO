const SESSION_KEY = "treeco_user"

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY)
  return raw ? JSON.parse(raw) : null
}

export function getUser() {
  return getSession()
}

export function getToken() {
  const session = getSession()
  return session?.token || session?.jwt || session?.accessToken || null
}

export function requireAuth() {
  if (!getSession()) {
    location.replace("index.html")
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
  location.replace("index.html")
}
