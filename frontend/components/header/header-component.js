/* ══════════════════════════════════════════════════════════════
   TREECO — header-component.js  v14
   ══════════════════════════════════════════════════════════════
   TUNING:
     SHOW_Y        — px from top that reveals header  (default 72)
     HIDE_DELAY_MS — ms before header hides           (default 300)
   ══════════════════════════════════════════════════════════════ */

	 class AppHeader extends HTMLElement {

		static NAV = [
			{ href: "./dashboard.html", label: "Dashboard",  kbd: "Alt+1",
				icon: `<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>` },
			{ href: "./projects.html",  label: "Proyectos",  kbd: "Alt+2",
				icon: `<path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>` },
			{ href: "./tasks.html",     label: "Tareas",     kbd: "Alt+3",
				icon: `<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>` },
			{ href: "./calendar.html",  label: "Calendario", kbd: "Alt+4",
				icon: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>` },
		]
	
		connectedCallback() {
			/* ── Nav: pure CSS active state, zero JS needed for positioning ── */
			const navItems = AppHeader.NAV.map((item, i) => `
				<a class="hn-link" href="${item.href}" data-tip="${item.label}" data-kbd="${item.kbd}">
					<svg class="hn-icon" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="1.8"
						stroke-linecap="round" stroke-linejoin="round"
						aria-hidden="true">${item.icon}</svg>
					<span class="hn-label">${item.label}</span>
				</a>`).join("")
	
			const mobileItems = AppHeader.NAV.map(item => `
				<li>
					<a href="${item.href}">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
							aria-hidden="true">${item.icon}</svg>
						<span>${item.label}</span>
					</a>
				</li>`).join("")
	
			this.innerHTML = `
				<div id="appHeader">
					<div class="h-island">
						<div class="h-shimmer-clip" aria-hidden="true"><div class="h-shimmer"></div></div>
						<div class="h-island-content">
	
						<a class="h-logo" href="./dashboard.html" aria-label="TreeCO">
							<img src="./assets/img/favicon/TreeCO.svg" alt="" width="20" height="20" draggable="false"/>
							<span class="h-logo-name">Tree<span>CO</span></span>
						</a>
	
						<div class="h-div" aria-hidden="true"></div>
	
						<nav class="hn" aria-label="Navegación principal">
							${navItems}
						</nav>
	
						<div class="h-div" aria-hidden="true"></div>
	
						<div class="h-right">
							<button class="h-chip" id="hChip"
								aria-haspopup="true" aria-expanded="false"
								aria-label="Menú de usuario">
								<div class="h-avatar" aria-hidden="true">
									<svg viewBox="0 0 24 24" fill="currentColor">
										<circle cx="12" cy="8" r="3.5"/>
										<path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
									</svg>
									<div class="h-avatar-dot"></div>
								</div>
								<span class="h-username" id="hUsername">Usuario</span>
								<svg class="h-caret" viewBox="0 0 24 24" fill="none"
									stroke="currentColor" stroke-width="2.2"
									stroke-linecap="round" stroke-linejoin="round"
									aria-hidden="true">
									<polyline points="6 9 12 15 18 9"/>
								</svg>
							</button>
	
							<div class="h-dropdown" id="hDropdown" role="menu" aria-hidden="true">
								<div class="h-dd-header">
									<div class="h-dd-av" aria-hidden="true">
										<svg viewBox="0 0 24 24" fill="currentColor">
											<circle cx="12" cy="8" r="3.5"/>
											<path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/>
										</svg>
									</div>
									<div class="h-dd-info">
										<span class="h-dd-name" id="hDdName">Usuario</span>
										<span class="h-dd-role">Miembro activo</span>
									</div>
								</div>
								<ul class="h-dd-list">
									<li>
										<button class="h-dd-item" id="hOpenProfile" role="menuitem">
											<div class="h-dd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
											<span class="h-dd-label">Ver perfil<span class="h-dd-sub">Editar información</span></span>
											<kbd class="h-dd-kbd">P</kbd>
										</button>
									</li>
									<li>
										<button class="h-dd-item" role="menuitem">
											<div class="h-dd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></div>
											<span class="h-dd-label">Preferencias<span class="h-dd-sub">Tema e idioma</span></span>
										</button>
									</li>
									<li><div class="h-dd-divider" role="separator"></div></li>
									<li class="h-logout-li" id="hLogoutLi">
										<button class="h-dd-item h-dd-logout" id="hLogoutTrigger" role="menuitem">
											<div class="h-dd-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
											<span class="h-dd-label">Cerrar sesión<span class="h-dd-sub">Salir de tu cuenta</span></span>
										</button>
										<div class="h-logout-bar" id="hLogoutBar" aria-hidden="true">
											<span class="h-logout-txt">¿Salir de <strong>TreeCO</strong>?</span>
											<button class="h-logout-yes" id="hLogoutYes">
												<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Sí
											</button>
											<button class="h-logout-no" id="hLogoutNo" aria-label="Cancelar">
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
											</button>
										</div>
									</li>
								</ul>
							</div>
	
							<button class="h-burger" id="hBurger" aria-label="Abrir menú" aria-expanded="false">
								<span></span><span></span><span></span>
							</button>
						</div>
						</div><!-- /.h-island-content -->
					</div>
				</div>
	
				<div class="h-mobile-nav" id="hMobileNav" aria-hidden="true">
					<ul class="h-mobile-links">${mobileItems}</ul>
					<div class="h-mobile-footer">
						<span class="h-mobile-username" id="hMobileUser"></span>
						<button class="h-mobile-logout" id="hMobileLogout">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
							Salir
						</button>
					</div>
				</div>
			`
	
			this._header = this.querySelector("#appHeader")

			// Fire entry animation on first load
			const _h = this._header
			if (_h) {
				_h.classList.add("h-showing")
				setTimeout(() => _h.classList.remove("h-showing"), 900)
			}

			this._initSession()
			this._setActive()
			this._initHoverReveal()
			this._initChip()
			this._initLogout()
			this._initBurger()
			this._initProfile()
			this._initShortcuts()
		}
	
		/* ── Session ─────────────────────────────────────────────── */
		_initSession() {
			const raw = localStorage.getItem("treeco_user")
			if (!raw) { location.replace("index.html"); return }
			let user
			try { user = JSON.parse(raw) } catch {
				localStorage.removeItem("treeco_user"); location.replace("index.html"); return
			}
			const name = user?.username ?? ""
			;["hUsername","hDdName","hMobileUser"].forEach(id => {
				const el = this.querySelector(`#${id}`)
				if (el) el.textContent = name
			})
			this._username = name
			this._doLogout = () => { localStorage.removeItem("treeco_user"); location.replace("index.html") }
			this.querySelector("#hMobileLogout")?.addEventListener("click", this._doLogout)
		}
	
		/* ── Active link — pure CSS, just add class ──────────────── */
		_setActive() {
			const page = location.pathname.split("/").pop() || "dashboard.html"
			this.querySelectorAll(".hn-link, .h-mobile-links a").forEach(a => {
				a.classList.toggle("active", a.getAttribute("href")?.endsWith(page) ?? false)
			})
		}
	
		/* ── Hover reveal ────────────────────────────────────────── */
		_initHoverReveal() {
			const header = this._header
			if (!header || "ontouchstart" in window) return
	
			// ╔══════════════════════════════════════════════════════╗
			// ║  TUNING                                              ║
			const SHOW_Y        = 50   // px from top to reveal
			const HIDE_DELAY_MS = 300   // ms before hiding
			// ╚══════════════════════════════════════════════════════╝
	
			// Hover hint — line + label pill
			const hint = document.createElement("div")
			hint.className = "h-hover-hint"
			document.body.appendChild(hint)
			this._hoverHint = hint

			// Label pill below the line
			const label = document.createElement("div")
			label.className = "h-hover-label"
			label.innerHTML = `
				<span class="h-hover-label-dot"></span>
				<span class="h-hover-label-text"><span>TreeCO</span> — menú</span>
				<span class="h-hover-label-chevron">
					<svg width="10" height="10" viewBox="0 0 12 12" fill="none">
						<path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</span>`
			document.body.appendChild(label)
			this._hoverLabel = label
	
			let hidden = false, timer = null, hintTimer = null
	
			const isOpen = () =>
				this.querySelector("#hChip")?.getAttribute("aria-expanded") === "true" ||
				this.querySelector("#hMobileNav")?.classList.contains("open") ||
				!!document.querySelector(".h-profile-panel.open")
	
			let showAnimTimer = null
	
			// Trigger a one-shot pulse on the hint line
			const pulseHint = (cls) => {
				hint.classList.remove("h-hint-release", "h-hint-absorb")
				void hint.offsetWidth // reflow to restart animation
				hint.classList.add(cls)
				setTimeout(() => hint.classList.remove(cls), 600)
			}
	
			const show = () => {
				clearTimeout(timer)
				clearTimeout(hintTimer)
				clearTimeout(showAnimTimer)
				if (!hidden) return
				hidden = false
	
				// Hint line pulses outward as if releasing the header
				pulseHint("h-hint-release")
				hint.classList.remove("h-hint-visible")
				label.classList.remove("h-hint-visible")
				label.classList.add("h-hint-hiding")
				setTimeout(() => label.classList.remove("h-hint-hiding"), 260)
	
				// Remove exit states, add entry animation
				header.classList.remove("h-hidden", "h-hiding")
				header.classList.add("h-showing")
	
				// Retrigger shimmer
				const shimmer = this.querySelector(".h-shimmer")
				if (shimmer) {
					shimmer.style.animation = "none"
					shimmer.offsetWidth
					shimmer.style.animation = ""
				}
	
				showAnimTimer = setTimeout(() => header.classList.remove("h-showing"), 700)
			}
	
			const scheduleHide = () => {
				clearTimeout(timer)
				timer = setTimeout(() => {
					if (isOpen()) return
					hidden = true
	
					header.classList.remove("h-showing")
					header.classList.add("h-hiding")
	
					setTimeout(() => {
						header.classList.remove("h-hiding")
						header.classList.add("h-hidden")
						// Hint line pulses inward as if absorbing the header
						pulseHint("h-hint-absorb")
						hintTimer = setTimeout(() => {
						hint.classList.add("h-hint-visible")
						label.classList.remove("h-hint-hiding")
						label.classList.add("h-hint-visible")
					}, 200)
					}, 460) // match islandExit duration
				}, HIDE_DELAY_MS)
			}
	
			document.addEventListener("mousemove", (e) => {
				if (isOpen()) { clearTimeout(timer); show(); return }
				e.clientY <= SHOW_Y ? show() : (!hidden && scheduleHide())
			}, { passive: true })
	
			header.addEventListener("mouseenter", () => { clearTimeout(timer); show() })
			header.addEventListener("mouseleave", (e) => {
				if (e.clientY > SHOW_Y && !isOpen()) scheduleHide()
			})
		}
	
		/* ── Chip — click anchored ───────────────────────────────── */
		_initChip() {
			const chip = this.querySelector("#hChip")
			const dd   = this.querySelector("#hDropdown")
			if (!chip || !dd) return
	
			let open = false
			const openFn  = () => { open = true;  chip.setAttribute("aria-expanded","true");  chip.classList.add("open");    dd.setAttribute("aria-hidden","false"); dd.classList.add("open") }
			const closeFn = () => { open = false; chip.setAttribute("aria-expanded","false"); chip.classList.remove("open"); dd.setAttribute("aria-hidden","true");  dd.classList.remove("open") }
	
			chip.addEventListener("click", (e) => { e.stopPropagation(); open ? closeFn() : openFn() })
			dd.addEventListener("click", (e) => e.stopPropagation())
			document.addEventListener("click", () => { if (open) closeFn() })
			document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) { closeFn(); chip.focus() } })
			chip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open ? closeFn() : openFn() } })
	
			this._closeChip = closeFn
		}
	
		/* ── Logout ──────────────────────────────────────────────── */
		_initLogout() {
			const trigger = this.querySelector("#hLogoutTrigger")
			const bar     = this.querySelector("#hLogoutBar")
			const yes     = this.querySelector("#hLogoutYes")
			const no      = this.querySelector("#hLogoutNo")
			const li      = this.querySelector("#hLogoutLi")
			if (!trigger || !bar || !li) return
			let t = null
			const showBar = () => { clearTimeout(t); li.classList.add("confirming"); bar.classList.add("visible"); bar.setAttribute("aria-hidden","false"); yes?.focus(); t = setTimeout(hideBar, 6000) }
			const hideBar = () => { clearTimeout(t); li.classList.remove("confirming"); bar.classList.remove("visible"); bar.setAttribute("aria-hidden","true") }
			trigger.addEventListener("click", showBar)
			yes?.addEventListener("click", () => { hideBar(); setTimeout(() => this._doLogout?.(), 120) })
			no?.addEventListener("click",  () => { hideBar(); trigger.focus() })
			bar?.addEventListener("keydown", (e) => { if (e.key === "Escape") { hideBar(); trigger.focus() } })
		}
	
		/* ── Burger ──────────────────────────────────────────────── */
		_initBurger() {
			const btn = this.querySelector("#hBurger")
			const nav = this.querySelector("#hMobileNav")
			if (!btn || !nav) return
			const close = () => { nav.classList.remove("open"); btn.classList.remove("open"); btn.setAttribute("aria-expanded","false"); nav.setAttribute("aria-hidden","true") }
			btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.classList.toggle("open",o); btn.setAttribute("aria-expanded",String(o)); nav.setAttribute("aria-hidden",String(!o)) })
			document.addEventListener("keydown", (e) => { if (e.key === "Escape") close() })
			nav.querySelectorAll("a").forEach(a => a.addEventListener("click", close))
		}
	
		/* ── Profile panel ───────────────────────────────────────── */
		_initProfile() {
			const overlay = document.createElement("div")
			overlay.className = "h-profile-overlay"
			overlay.setAttribute("aria-hidden","true")
	
			const panel = document.createElement("div")
			panel.className = "h-profile-panel"
			panel.setAttribute("role","dialog")
			panel.setAttribute("aria-modal","true")
			panel.setAttribute("tabindex","-1")
			panel.innerHTML = `
				<div class="h-pp-head">
					<button class="h-pp-close" id="hPpClose" aria-label="Cerrar">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
					</button>
				</div>
				<div class="h-pp-hero">
					<div class="h-pp-avatar">
						<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7"/></svg>
						<div class="h-pp-online" aria-hidden="true"></div>
					</div>
					<div class="h-pp-name" id="hPpName">Usuario</div>
					<div class="h-pp-badge"><div class="h-pp-badge-dot" aria-hidden="true"></div>Activo</div>
				</div>
				<div class="h-pp-stats">
					<div class="h-pp-stat"><span class="h-pp-stat-v">12</span><span class="h-pp-stat-l">Proyectos</span></div>
					<div class="h-pp-stat"><span class="h-pp-stat-v">48</span><span class="h-pp-stat-l">Tareas</span></div>
					<div class="h-pp-stat"><span class="h-pp-stat-v">3</span><span class="h-pp-stat-l">Equipos</span></div>
				</div>
				<div class="h-pp-body">
					<div class="h-pp-section">
						<ul class="h-pp-list">
							<li><button class="h-pp-btn"><div class="h-pp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><span class="h-pp-label">Editar perfil<span class="h-pp-desc">Nombre y foto</span></span><svg class="h-pp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button></li>
							<li><button class="h-pp-btn"><div class="h-pp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><span class="h-pp-label">Seguridad<span class="h-pp-desc">Contraseña y acceso</span></span><svg class="h-pp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button></li>
							<li><button class="h-pp-btn"><div class="h-pp-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg></div><span class="h-pp-label">Preferencias<span class="h-pp-desc">Tema, idioma</span></span><svg class="h-pp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button></li>
						</ul>
					</div>
				</div>
				<div class="h-pp-foot">
					<button class="h-pp-logout-btn" id="hPpLogout">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="14" height="14" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
						Cerrar sesión
					</button>
				</div>`
	
			document.body.appendChild(overlay)
			document.body.appendChild(panel)
	
			let lastFocus = null
			const open = () => {
				this._closeChip?.(); lastFocus = document.activeElement
				panel.querySelector("#hPpName").textContent = this._username ?? "Usuario"
				overlay.classList.remove("closing"); panel.classList.remove("closing")
				overlay.classList.add("open");       panel.classList.add("open")
				overlay.setAttribute("aria-hidden","false")
				setTimeout(() => panel.focus(), 50)
			}
			const close = () => {
				overlay.classList.remove("open"); panel.classList.remove("open")
				overlay.classList.add("closing"); panel.classList.add("closing")
				const done = () => { overlay.classList.remove("closing"); panel.classList.remove("closing"); overlay.setAttribute("aria-hidden","true"); lastFocus?.focus() }
				panel.addEventListener("animationend", done, { once: true })
				setTimeout(done, 300)
			}
			panel.addEventListener("keydown", (e) => {
				if (e.key === "Escape") { close(); return }
				if (e.key !== "Tab") return
				const els = [...panel.querySelectorAll("button,[href],[tabindex]")].filter(x => !x.disabled)
				const first = els[0], last = els[els.length-1]
				if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
				else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
			})
			this.querySelector("#hOpenProfile")?.addEventListener("click", open)
			panel.querySelector("#hPpClose")?.addEventListener("click", close)
			overlay.addEventListener("click", close)
			panel.querySelector("#hPpLogout")?.addEventListener("click", () => { close(); setTimeout(() => this._doLogout?.(), 260) })
			this._openProfile = open; this._profilePanel = panel; this._profileOverlay = overlay
		}
	
		/* ── Shortcuts ───────────────────────────────────────────── */
		_initShortcuts() {
			document.addEventListener("keydown", (e) => {
				if (e.altKey && !e.metaKey && !e.ctrlKey) {
					const idx = parseInt(e.key, 10) - 1
					if (idx >= 0 && idx < AppHeader.NAV.length) { e.preventDefault(); location.href = AppHeader.NAV[idx].href }
				}
				if ((e.key === "p" || e.key === "P") && !e.ctrlKey && !e.metaKey && !e.altKey) {
					const tag = document.activeElement?.tagName ?? ""
					if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") this._openProfile?.()
				}
			})
		}
	
		disconnectedCallback() {
			this._profilePanel?.remove()
			this._profileOverlay?.remove()
			this._hoverHint?.remove()
			this._hoverLabel?.remove()
		}
	}
	
	customElements.define("header-component", AppHeader)