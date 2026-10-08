/*======================================

        AEGIS DASHBOARD THEMES v0.1.0

        STAND-IN module (unpolished). AEGIS colors are
        hardcoded in a lot of places, so real per-widget
        theming is a bigger project. This stand-in applies
        a full-screen color filter per preset — crude, but
        it works everywhere instantly.

        Choice persists in localStorage ("aegisTheme") and
        is re-applied at boot.

        Page lives in the More hub, like Prayer Journal.

======================================*/


const THEMES_PAGE = "themes";

const THEMES_STORE_KEY = "aegisTheme";


const THEME_DEFS = [

    {

        id: "default",

        name: "Default",

        swatch: "#00d9ff",

        filter: ""

    },

    {

        id: "sunset",

        name: "Sunset",

        swatch: "#ff9a5c",

        filter: "hue-rotate(-35deg) saturate(1.25)"

    },

    {

        id: "forest",

        name: "Forest",

        swatch: "#5cff8a",

        filter: "hue-rotate(85deg) saturate(1.1)"

    },

    {

        id: "royal",

        name: "Royal",

        swatch: "#b45cff",

        filter: "hue-rotate(140deg) saturate(1.15)"

    },

    {

        id: "mono",

        name: "Mono",

        swatch: "#9aa7b5",

        filter: "grayscale(0.75)"

    }

];


let thPageEl = null;

let thGridEl = null;

let thTheme = "default";


/* ---------- data ---------- */


function thLoad() {

    try {

        const raw = localStorage.getItem(THEMES_STORE_KEY);

        if (raw) thTheme = raw;

    } catch (error) {}

}


function thSave() {

    try {

        localStorage.setItem(THEMES_STORE_KEY, thTheme);

    } catch (error) {}

}


function thDef(id) {

    for (let i = 0; i < THEME_DEFS.length; i++) {

        if (THEME_DEFS[i].id === id) return THEME_DEFS[i];

    }

    return THEME_DEFS[0];

}


function apply(id) {

    const def = thDef(id);

    thTheme = def.id;

    thSave();

    try {

        document.documentElement.style.filter = def.filter;

    } catch (error) {}

    refresh();

    try {

        Aegis.broadcast("themeChanged", { theme: thTheme });

    } catch (error) {}

    return thTheme;

}


function current() {

    return thTheme;

}


function list() {

    return THEME_DEFS.map((d) => d.id);

}


/* ---------- nav glue ---------- */


function thNav() {

    try {

        if (typeof Aegis !== "undefined" &&
            Aegis.getModule) {

            const mod = Aegis.getModule("navigation");

            if (mod && mod.api) return mod.api;

        }

    } catch (error) {}

    return null;

}


function thShowPage(name) {

    const nav = thNav();

    if (nav && typeof nav.showPage === "function") {

        nav.showPage(name);

        return;

    }

    const pages = document.querySelectorAll
        ? document.querySelectorAll(".aegis-page")
        : [];

    Array.prototype.forEach.call(pages, (page) => {

        const on = page.dataset &&
            page.dataset.page === name;

        if (page.classList) {

            page.classList.toggle("active", !!on);

        }

    });

}


function thGoMore() {

    thShowPage("more");

}


function thHookNavigation() {

    const nav = thNav();

    if (!nav || !thPageEl) return false;

    try {

        if (nav._els && Array.isArray(nav._els.pages)) {

            if (nav._els.pages.indexOf(thPageEl) < 0) {

                nav._els.pages.push(thPageEl);

            }

            return true;

        }

    } catch (error) {}

    return false;

}


function thAddMoreEntry() {

    try {

        const hubList = document.querySelector(".aegis-more-list");

        if (!hubList) return false;

        if (hubList.querySelector(
            '[data-goto-page="' + THEMES_PAGE + '"]'
        )) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", THEMES_PAGE);

        item.textContent = "🎨 Dashboard Themes";

        item.addEventListener("click", open);

        const divider = hubList.querySelector("hr");

        if (divider) {

            hubList.insertBefore(item, divider);

        } else {

            hubList.appendChild(item);

        }

        return true;

    } catch (error) {

        return false;

    }

}


function thStyle(el, styles) {

    try {

        Object.assign(el.style, styles);

    } catch (error) {}

}


/* ---------- page ---------- */


function open() {

    thShowPage(THEMES_PAGE);

}


function refresh() {

    if (!thGridEl) return;

    thGridEl.innerHTML = "";

    THEME_DEFS.forEach((def) => {

        const btn = document.createElement("button");

        const active = thTheme === def.id;

        thStyle(btn, {

            display: "flex",

            alignItems: "center",

            gap: "10px",

            width: "100%",

            textAlign: "left",

            padding: "10px 12px",

            borderRadius: "12px",

            border: "1px solid rgba(80, 210, 255, " +
                (active ? "0.8" : "0.25") + ")",

            background: active
                ? "rgba(80, 210, 255, 0.12)"
                : "transparent",

            color: "#9fdcff",

            fontSize: "13px",

            cursor: "pointer",

            marginBottom: "8px"

        });

        const dot = document.createElement("span");

        thStyle(dot, {

            width: "22px",

            height: "22px",

            borderRadius: "50%",

            background: def.swatch,

            border: "1px solid rgba(255,255,255,0.35)",

            flexShrink: "0"

        });

        const label = document.createElement("span");

        label.textContent = def.name + (active ? " ✓" : "");

        btn.appendChild(dot);

        btn.appendChild(label);

        btn.addEventListener("click", () => apply(def.id));

        thGridEl.appendChild(btn);

    });

}


function thBuildPage() {

    thPageEl = document.createElement("div");

    thPageEl.className = "aegis-page";

    thPageEl.dataset.page = THEMES_PAGE;

    const back = document.createElement("button");

    back.className = "aegis-page-back";

    back.setAttribute("data-back-to", "more");

    back.textContent = "← Back to More";

    back.addEventListener("click", thGoMore);

    thPageEl.appendChild(back);

    const card = document.createElement("section");

    card.className = "card";

    const h2 = document.createElement("h2");

    h2.textContent = "🎨 Dashboard Themes";

    card.appendChild(h2);

    const note = document.createElement("div");

    note.textContent =
        "Stand-in: each theme is a full-screen color filter. " +
        "Real per-widget theming comes later.";

    thStyle(note, {

        fontSize: "11px",

        color: "rgba(159, 220, 255, 0.55)",

        marginBottom: "12px"

    });

    card.appendChild(note);

    thGridEl = document.createElement("div");

    card.appendChild(thGridEl);

    thPageEl.appendChild(card);

    document.body.appendChild(thPageEl);

}


Aegis.register("themes", {

    version: "0.1.0",

    name: "Dashboard Themes (stand-in)",


    apply,

    current,

    list,

    open,

    refresh,


    init() {

        thLoad();

        thBuildPage();

        thAddMoreEntry();

        refresh();

        /* Re-apply the saved theme at boot. */

        try {

            document.documentElement.style.filter =
                thDef(thTheme).filter;

        } catch (error) {}

        if (!thHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (thHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        console.log("Dashboard Themes (stand-in) initialized.");

    },


    refresh() {

        refresh();

    },


    shutdown() {

        try {

            document.documentElement.style.filter = "";

        } catch (error) {}

        if (thPageEl && thPageEl.parentNode) {

            thPageEl.parentNode.removeChild(thPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="' +
                THEMES_PAGE + '"]'
            );

            if (entry && entry.parentNode) {

                entry.parentNode.removeChild(entry);

            }

        } catch (error) {}

        thPageEl = null;

        console.log("Dashboard Themes (stand-in) shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            theme: thTheme

        };

    }

});
