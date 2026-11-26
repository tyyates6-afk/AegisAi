// AEGIS Navigation
// Version 1.2.2

(function (global) {
    "use strict";

    const Navigation = {
        name: "navigation",
        version: "1.2.2",

        _initialized: false,
        _els: {},
        _activeTab: "home",
        _activePage: "home",

        init() {
            if (this._initialized) return;

            this._buildDOM();
            this._bindEvents();
            this._bindLifecycleListeners();
            this._bindBackButtons();

            this.showPage("home", { force: true });

            this._initialized = true;

            console.log("✓ Navigation v1.2.2 initialized");
        },

        refresh() {
            this._updateActiveTab();

            if (this._activePage === "modules") {
                this._renderModulesList();
            }
        },

        shutdown() {
            if (this._els.nav) this._els.nav.remove();

            this._els = {};
            this._initialized = false;
        },

        status() {
            return {
                initialized: this._initialized,
                activeTab: this._activeTab,
                activePage: this._activePage
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

                    <button class="aegis-nav-item" data-tab="planner" type="button">
                        <span class="aegis-nav-icon">📅</span>
                        <span class="aegis-nav-label">Planner</span>
                    </button>

                    <button class="aegis-nav-item" data-tab="modules" type="button">
                        <span class="aegis-nav-icon">▦</span>
                        <span class="aegis-nav-label">Modules</span>
                    </button>

                    <button class="aegis-nav-item" data-tab="more" type="button">
                        <span class="aegis-nav-icon">•••</span>
                        <span class="aegis-nav-label">More</span>
                    </button>
                    
                    <button class="aegis-nav-item" data-tab="settings" type="button">
                        <span class="aegis-nav-icon">⚙️</span>
                        <span class="aegis-nav-label">Settings</span>
                    </button>

                `;

                document.body.appendChild(nav);
            }

            this._els.nav = nav;
            this._els.items = [...nav.querySelectorAll(".aegis-nav-item")];
            this._els.pages = [...document.querySelectorAll(".aegis-page")];
        },

        // ==================================
        // PAGE SWITCHING
        // ==================================

        getPages() {
            return (this._els.pages || []).map((page) => page.dataset.page);
        },

        showPage(pageName, options = {}) {
            if (!this.getPages().includes(pageName)) return false;

            if (this._activeTab !== "command") {
                this._activeTab = this._tabForPage(pageName);
                this._updateActiveTab();
            }

            const changingPage =
                this._activePage !== pageName;

            if (!changingPage && !options.force) {
                // Already on this page — nothing to do,
                // and definitely don't scroll.
                return true;
            }

            this._els.pages.forEach((page) => {
                page.classList.toggle(
                    "active",
                    page.dataset.page === pageName
                );
            });

            this._activePage = pageName;

            if (pageName === "modules") {
                this._renderModulesList();
            }

            if (changingPage) {
                // Instant reset, no animation — a smooth scroll
                // here reads as unwanted motion on a page swap.
                window.scrollTo(0, 0);
            }

            document.dispatchEvent(
                new CustomEvent("aegis:navigate", {
                    detail: { page: pageName }
                })
            );

            global.Aegis?.broadcast(`navigation:${pageName}`);
            return true;
        },
        
        // ==================================
        // MODULES PAGE CONTENT
        // ==================================

        _renderModulesList() {
            const list = document.getElementById("modulesList");

            if (!list) return;

            if (!global.Aegis) {
                list.innerHTML = `<p class="empty-state">AEGIS Core unavailable.</p>`;
                return;
            }

            const modules = Object.values(global.Aegis.modules);

            if (!modules.length) {
                list.innerHTML = `<p class="empty-state">No modules registered.</p>`;
                return;
            }

            const statusIcon = {
                ONLINE: "🟢",
                INITIALIZING: "🟡",
                ERROR: "🔴",
                REGISTERED: "⚪"
            };

            list.innerHTML = modules
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

        // ==================================
        // "MORE" HUB → SUBPAGE NAV
        // ==================================

        _bindBackButtons() {
            document.querySelectorAll("[data-back-to]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.showPage(button.dataset.backTo);
                });
            });

            document.querySelectorAll("[data-goto-page]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.showPage(button.dataset.gotoPage);
                });
            });
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
        },

        _bindLifecycleListeners() {
            if (!global.Aegis || typeof global.Aegis.listen !== "function") return;

            global.Aegis.listen("commandBar:opened", () => {
                this._activeTab = "command";
                this._updateActiveTab();
            });

            global.Aegis.listen("commandBar:closed", () => {
                this._activeTab = this._tabForPage(this._activePage);
                this._updateActiveTab();
            });
        },

        _tabForPage(page) {
            if (page === "home") return "home";
            if (page === "planner") return "planner";
            if (page === "modules") return "modules";
            if (page === "settings") return "settings";
            return "more";
        },

        _selectTab(tab) {

            if (tab === "command") {

                const commandBarModule =
                    global.Aegis?.getModule("commandBar");

                if (commandBarModule?.api?.toggle) {

                    commandBarModule.api.toggle();

                } else if (global.CommandBar?.toggle) {

                    global.CommandBar.toggle();

                } else {

                    console.error(
                        "Command Bar is unavailable."
                    );

                }

                return;
            }

            this.showPage(tab);
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
