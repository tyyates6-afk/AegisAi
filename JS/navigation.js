// AEGIS Navigation
// Version 1.1.0

(function (global) {
    "use strict";

    const Navigation = {
        name: "navigation",
        version: "1.1.0",

        _initialized: false,
        _els: {},
        _activeTab: "home",
        _previousTab: "home",

        init() {
            if (this._initialized) return;

            this._buildDOM();
            this._buildModulesPanel();
            this._buildMorePanel();
            this._bindEvents();
            this._bindLifecycleListeners();

            this._initialized = true;

            console.log("✓ Navigation v1.1.0 initialized");
        },

        refresh() {
            this._updateActiveTab();

            if (this._els.modulesList && this._els.modulesPanel.classList.contains("open")) {
                this._renderModulesList();
            }
        },

        shutdown() {
            if (this._els.nav) this._els.nav.remove();
            if (this._els.modulesPanel) this._els.modulesPanel.remove();
            if (this._els.morePanel) this._els.morePanel.remove();

            this._els = {};
            this._initialized = false;
        },

        status() {
            return {
                initialized: this._initialized,
                activeTab: this._activeTab
            };
        },

        // ==================================
        // BOTTOM NAV DOM
        // ==================================

        _buildDOM() {
            let nav = document.querySelector(".aegis-bottom-nav");

            if (!nav) {
                nav = document.createElement("nav");

                nav.className = "aegis-bottom-nav";
                nav.setAttribute("aria-label", "AEGIS Navigation");

                nav.innerHTML = `
                    <button class="aegis-nav-item active" data-tab="home" type="button">
                        <span class="aegis-nav-icon">⌂</span>
                        <span class="aegis-nav-label">Home</span>
                    </button>

                    <button class="aegis-nav-item" data-tab="command" type="button">
                        <span class="aegis-nav-icon">&gt;_</span>
                        <span class="aegis-nav-label">Command</span>
                    </button>

                    <button class="aegis-nav-item" data-tab="modules" type="button">
                        <span class="aegis-nav-icon">▦</span>
                        <span class="aegis-nav-label">Modules</span>
                    </button>

                    <button class="aegis-nav-item" data-tab="more" type="button">
                        <span class="aegis-nav-icon">•••</span>
                        <span class="aegis-nav-label">More</span>
                    </button>
                `;

                document.body.appendChild(nav);
            }

            this._els.nav = nav;
            this._els.items = [
                ...nav.querySelectorAll(".aegis-nav-item")
            ];
        },

        // ==================================
        // MODULES PANEL
        // ==================================

        _buildModulesPanel() {
            let panel = document.querySelector(".aegis-nav-overlay.modules-panel");

            if (!panel) {
                panel = document.createElement("div");

                panel.className = "aegis-nav-overlay modules-panel";

                panel.innerHTML = `
                    <div class="aegis-nav-sheet" role="dialog" aria-label="AEGIS Modules">
                        <div class="aegis-nav-sheet-header">
                            <h3>▦ AEGIS Modules</h3>
                            <button class="aegis-nav-close" type="button" aria-label="Close">✕</button>
                        </div>

                        <div class="aegis-modules-list"></div>
                    </div>
                `;

                document.body.appendChild(panel);
            }

            this._els.modulesPanel = panel;
            this._els.modulesList = panel.querySelector(".aegis-modules-list");

            panel.addEventListener("mousedown", (event) => {
                if (event.target === panel) this._closePanels();
            });

            panel.querySelector(".aegis-nav-close")
                .addEventListener("click", () => this._closePanels());
        },

        _renderModulesList() {
            if (!global.Aegis) {
                this._els.modulesList.innerHTML = `<p class="empty-state">AEGIS Core unavailable.</p>`;
                return;
            }

            const modules = Object.values(global.Aegis.modules);

            if (!modules.length) {
                this._els.modulesList.innerHTML = `<p class="empty-state">No modules registered.</p>`;
                return;
            }

            const statusIcon = {
                ONLINE: "🟢",
                INITIALIZING: "🟡",
                ERROR: "🔴",
                REGISTERED: "⚪"
            };

            this._els.modulesList.innerHTML = modules
                .map(module => `
                    <div class="aegis-module-row">
                        <span class="aegis-module-status">
                            ${statusIcon[module.status] || "⚪"}
                        </span>

                        <div class="aegis-module-info">
                            <strong>${module.name}</strong>
                            <small>v${module.version} — ${module.status}</small>
                        </div>
                    </div>
                `)
                .join("");
        },

        _openModulesPanel() {
            this._renderModulesList();
            this._els.modulesPanel.classList.add("open");
        },

        // ==================================
        // MORE PANEL
        // ==================================

        _buildMorePanel() {
            let panel = document.querySelector(".aegis-nav-overlay.more-panel");

            if (!panel) {
                panel = document.createElement("div");

                panel.className = "aegis-nav-overlay more-panel";

                panel.innerHTML = `
                    <div class="aegis-nav-sheet" role="dialog" aria-label="More">
                        <div class="aegis-nav-sheet-header">
                            <h3>••• More</h3>
                            <button class="aegis-nav-close" type="button" aria-label="Close">✕</button>
                        </div>

                        <div class="aegis-more-list">

                            <button class="aegis-more-item" data-target="#calendar">
                                📅 Planner
                            </button>

                            <button class="aegis-more-item" data-target="#reminderList">
                                🔔 Reminders
                            </button>

                            <button class="aegis-more-item" data-target="#userName">
                                ⚙️ Profile Settings
                            </button>

                            <button class="aegis-more-item" data-target="#categoryList">
                                🏷️ Categories
                            </button>

                            <hr>

                            <button class="aegis-more-item" data-action="editDashboard">
                                🛠 Edit Dashboard
                            </button>

                            <button class="aegis-more-item" data-action="addWidget">
                                ➕ Add Widget
                            </button>

                        </div>
                    </div>
                `;

                document.body.appendChild(panel);
            }

            this._els.morePanel = panel;

            panel.addEventListener("mousedown", (event) => {
                if (event.target === panel) this._closePanels();
            });

            panel.querySelector(".aegis-nav-close")
                .addEventListener("click", () => this._closePanels());

            panel.querySelectorAll(".aegis-more-item[data-target]")
                .forEach(button => {
                    button.addEventListener("click", () => {
                        const target = document.querySelector(button.dataset.target);

                        this._closePanels();

                        if (target) {
                            setTimeout(() => {
                                target.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 150);
                        }
                    });
                });

            panel.querySelector('[data-action="editDashboard"]')
                .addEventListener("click", () => {
                    this._closePanels();
                    global.Dashboard?.toggleEditMode();
                    document.getElementById("dashboard")
                        ?.scrollIntoView({ behavior: "smooth" });
                });

            panel.querySelector('[data-action="addWidget"]')
                .addEventListener("click", () => {
                    this._closePanels();
                    global.Dashboard?.openWidgetGallery();
                    document.getElementById("dashboard")
                        ?.scrollIntoView({ behavior: "smooth" });
                });
        },

        _openMorePanel() {
            this._els.morePanel.classList.add("open");
        },

        _closePanels() {
            this._els.modulesPanel?.classList.remove("open");
            this._els.morePanel?.classList.remove("open");

            this._activeTab = this._previousTab || "home";
            this._updateActiveTab();
        },

        // ==================================
        // EVENTS
        // ==================================

        _bindEvents() {
            if (!this._els.items) return;

            this._els.items.forEach((item) => {
                item.addEventListener("click", () => {
                    this._selectTab(item.dataset.tab);
                });
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") this._closePanels();
            });
        },

        _bindLifecycleListeners() {
            if (!global.Aegis || typeof global.Aegis.listen !== "function") {
                return;
            }

            global.Aegis.listen("commandBar:closed", () => {
                this._activeTab = this._previousTab || "home";
                this._updateActiveTab();
            });
        },

        _selectTab(tab) {
            if (tab !== "command" && tab !== "modules" && tab !== "more") {
                this._previousTab = tab;
            }

            this._activeTab = tab;
            this._updateActiveTab();

            if (tab === "command") {
                this._closeSheets();

                if (global.Aegis?.run) {
                    global.Aegis.run("commandBar", "toggle");
                } else if (global.CommandBar?.toggle) {
                    global.CommandBar.toggle();
                }

                return;
            }

            if (tab === "modules") {
                this._els.morePanel?.classList.remove("open");
                this._openModulesPanel();
                return;
            }

            if (tab === "more") {
                this._els.modulesPanel?.classList.remove("open");
                this._openMorePanel();
                return;
            }

            // "home" — close any open sheets and scroll up
            this._closeSheets();

            document.getElementById("dashboard")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });

            document.dispatchEvent(
                new CustomEvent("aegis:navigate", {
                    detail: { page: tab }
                })
            );

            global.Aegis?.broadcast(`navigation:${tab}`);
        },

        _closeSheets() {
            this._els.modulesPanel?.classList.remove("open");
            this._els.morePanel?.classList.remove("open");
        },

        _updateActiveTab() {
            if (!this._els.items) return;

            this._els.items.forEach((item) => {
                const active = item.dataset.tab === this._activeTab;

                item.classList.toggle("active", active);

                if (active) {
                    item.setAttribute("aria-current", "page");
                } else {
                    item.removeAttribute("aria-current");
                }
            });
        }
    };

    global.Navigation = Navigation;

    document.addEventListener("DOMContentLoaded", () => {
        Navigation.init();
    });

})(window);