// AEGIS Navigation Module
// Version: 1.0.0

(function (global) {
    "use strict";

    const Navigation = {
        name: "navigation",
        version: "1.0.0",

        _initialized: false,
        _els: {},
        _activeTab: "home",

        init() {
            if (this._initialized) return;

            this._buildDOM();
            this._bindEvents();
            this._initialized = true;

            console.log("[Navigation] Initialized");

            global.Aegis?.broadcast("navigation:ready", {
                module: this.name
            });
        },

        refresh() {
            this._updateActiveTab();
        },

        shutdown() {
            this._els.nav?.remove();
            this._els = {};
            this._initialized = false;
        },

        status() {
            return {
                initialized: this._initialized,
                activeTab: this._activeTab
            };
        },

        _buildDOM() {
            if (document.querySelector(".aegis-bottom-nav")) return;

            const nav = document.createElement("nav");
            nav.className = "aegis-bottom-nav";
            nav.setAttribute("aria-label", "AEGIS Navigation");

            nav.innerHTML = `
                <button
                    class="aegis-nav-item active"
                    data-tab="home"
                    type="button"
                    aria-label="Home"
                    aria-current="page"
                >
                    <span class="aegis-nav-icon">⌂</span>
                    <span class="aegis-nav-label">Home</span>
                </button>

                <button
                    class="aegis-nav-item"
                    data-tab="command"
                    type="button"
                    aria-label="Command"
                >
                    <span class="aegis-nav-icon">&gt;_</span>
                    <span class="aegis-nav-label">Command</span>
                </button>

                <button
                    class="aegis-nav-item"
                    data-tab="modules"
                    type="button"
                    aria-label="Modules"
                >
                    <span class="aegis-nav-icon">▦</span>
                    <span class="aegis-nav-label">Modules</span>
                </button>

                <button
                    class="aegis-nav-item"
                    data-tab="more"
                    type="button"
                    aria-label="More"
                >
                    <span class="aegis-nav-icon">•••</span>
                    <span class="aegis-nav-label">More</span>
                </button>
            `;

            document.body.appendChild(nav);

            this._els.nav = nav;
            this._els.items = [
                ...nav.querySelectorAll(".aegis-nav-item")
            ];
        },

        _bindEvents() {
            this._els.items.forEach((item) => {
                item.addEventListener("pointerup", (event) => {
                    event.preventDefault();

                    const tab = item.dataset.tab;
                    this._selectTab(tab);
                });
            });
        },

        _selectTab(tab) {
            this._activeTab = tab;
            this._updateActiveTab();

            switch (tab) {
                case "home":
                    global.Aegis?.broadcast("navigation:home");
                    break;

                case "command":
                    global.Aegis?.run("commandBar", "toggle");
                    break;

                case "modules":
                    global.Aegis?.broadcast("navigation:modules");
                    break;

                case "more":
                    global.Aegis?.broadcast("navigation:more");
                    break;
            }
        },

        _updateActiveTab() {
            this._els.items?.forEach((item) => {
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