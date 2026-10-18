/*======================================

        AEGIS DASHBOARD THEMES v1.0.0

        Real theming for the AEGIS dashboard.
        The old v0.1.0 was a stand-in that slapped a
        full-screen CSS filter over everything (hue-rotate
        etc.) — crude, and it tinted photos and sprites too.

        v1.0.0 recolors the dashboard's actual palette:

        1. Redefines the :root custom properties
           (--primary, --secondary, --border).
        2. Injects a <style id="aegis-theme-override"> sheet,
           last in <head>, carrying rewritten copies of every
           stylesheet rule that used the old accent colors.
        3. Sweeps JS-built inline styles (focus, timer, prayer
           and the other modules hardcode the cyan inline) and
           keeps a MutationObserver running so later re-renders
           get re-themed without touching those modules.

        Presets: Default, Sunset, Forest, Royal, Mono.
        Plus a color-wheel Custom theme — pick any color and
        the whole accent ramp (accent / light / soft) is
        derived from it.

        Semantic colors are NEVER remapped: danger reds,
        success green and the pet's hungry amber stay fixed
        across every theme.

        Choice persists in localStorage ("aegisTheme"); a custom
        accent persists under "aegisThemeCustom".

        Drop-in: one script tag AFTER core.js (ideally last).
        File: themes-1.0.0.js (cache-busted name).

======================================*/


const THEMES_PAGE = "themes";

const THEMES_STORE_KEY = "aegisTheme";

const THEMES_CUSTOM_KEY = "aegisThemeCustom";

const THEMES_STYLE_ID = "aegis-theme-override";

const THEMES_SKIP_ATTR = "data-th-skip";

const THEMES_ORIG_ATTR = "data-th-orig";


/* ---------- pure color utils (no DOM — unit-testable) ---------- */


function thHexToRgb(hex) {

    const h = hex.replace("#", "");

    const r = parseInt(h.slice(0, 2), 16);

    const g = parseInt(h.slice(2, 4), 16);

    const b = parseInt(h.slice(4, 6), 16);

    return r + "," + g + "," + b;

}


function thRgbToHex(r, g, b) {

    const c = (n) => {

        const s = Math.max(0, Math.min(255, Math.round(n))).toString(16);

        return s.length === 1 ? "0" + s : s;

    };

    return "#" + c(r) + c(g) + c(b);

}


function thMixHex(hexA, hexB, t) {

    const pa = hexA.replace("#", "");

    const pb = hexB.replace("#", "");

    const r = parseInt(pa.slice(0, 2), 16) * (1 - t) +
        parseInt(pb.slice(0, 2), 16) * t;

    const g = parseInt(pa.slice(2, 4), 16) * (1 - t) +
        parseInt(pb.slice(2, 4), 16) * t;

    const b = parseInt(pa.slice(4, 6), 16) * (1 - t) +
        parseInt(pb.slice(4, 6), 16) * t;

    return thRgbToHex(r, g, b);

}


function thValidHex(hex) {

    return typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex);

}


/* Build the full accent ramp from one base color:
   accent (the base), light (accent-tinted text),
   soft (palest tint). */

function thRampFor(accentHex) {

    const accent = accentHex.toLowerCase();

    const light = thMixHex(accent, "#ffffff", 0.55);

    const soft = thMixHex(accent, "#ffffff", 0.82);

    return {

        accent: accent,

        accentRgb: thHexToRgb(accent),

        light: light,

        lightRgb: thHexToRgb(light),

        soft: soft,

        softRgb: thHexToRgb(soft)

    };

}


/* ---------- theme definitions ---------- */


const THEME_DEFS = [

    { id: "default", name: "Default", accent: "#00d9ff" },

    { id: "sunset", name: "Sunset", accent: "#ff9a5c" },

    { id: "forest", name: "Forest", accent: "#5cff8a" },

    { id: "royal", name: "Royal", accent: "#b45cff" },

    { id: "mono", name: "Mono", accent: "#9aa7b5" },

    { id: "custom", name: "Custom", accent: null }

];


/* Source colors the dashboard actually uses, grouped by role.
   Triplets cover rgb()/rgba() serializations (stylesheets and
   inline styles); hexes cover as-authored stylesheet values.
   Semantic colors (danger red, success green, hungry amber)
   are deliberately absent — they never remap. */

const TH_TRIPLETS = [

    /* accent role */

    [0, 217, 255, "accent"],

    [80, 210, 255, "accent"],

    [0, 170, 255, "accent"],

    [0, 180, 255, "accent"],

    /* light role (accent-tinted text) */

    [102, 234, 255, "light"],

    [102, 204, 255, "light"],

    [125, 211, 252, "light"],

    [126, 230, 255, "light"],

    [51, 195, 255, "light"],

    [159, 220, 255, "light"],

    /* soft role (palest tints) */

    [174, 241, 255, "soft"],

    [234, 247, 255, "soft"]

];


const TH_HEXES = [

    ["#00d9ff", "accent"],

    ["#50d2ff", "accent"],

    ["#66eaff", "light"],

    ["#66ccff", "light"],

    ["#7dd3fc", "light"],

    ["#7ee6ff", "light"],

    ["#33c3ff", "light"],

    ["#9fdcff", "light"],

    ["#aef1ff", "soft"],

    ["#eaf7ff", "soft"]

];


const TH_TRIPLET_RES = TH_TRIPLETS.map((t) => ({

    role: t[3],

    re: new RegExp(

        "rgba?\\(\\s*" + t[0] + "\\s*,\\s*" + t[1] + "\\s*,\\s*" + t[2] +
        "\\s*(?:,\\s*([\\d.]+)\\s*)?\\)",

        "gi"

    )

}));


const TH_HEX_RES = TH_HEXES.map((h) => ({

    role: h[1],

    re: new RegExp(h[0], "gi")

}));


function thRampColor(ramp, role) {

    if (role === "light") return { hex: ramp.light, rgb: ramp.lightRgb };

    if (role === "soft") return { hex: ramp.soft, rgb: ramp.softRgb };

    return { hex: ramp.accent, rgb: ramp.accentRgb };

}


/* Pure string rewrite: swap every known source color for the
   theme ramp's equivalent, preserving alpha. */

function thRewriteColors(text, ramp) {

    if (!text || typeof text !== "string") return text;

    let out = text;

    for (let i = 0; i < TH_TRIPLET_RES.length; i++) {

        const item = TH_TRIPLET_RES[i];

        item.re.lastIndex = 0;

        const rgb = thRampColor(ramp, item.role).rgb;

        out = out.replace(item.re, (m, a) =>

            a === undefined ? "rgb(" + rgb + ")" : "rgba(" + rgb + "," + a + ")"

        );

    }

    for (let i = 0; i < TH_HEX_RES.length; i++) {

        const item = TH_HEX_RES[i];

        item.re.lastIndex = 0;

        out = out.replace(item.re, thRampColor(ramp, item.role).hex);

    }

    return out;

}


function thHasNeedle(text) {

    if (!text || typeof text !== "string") return false;

    for (let i = 0; i < TH_TRIPLETS.length; i++) {

        const t = TH_TRIPLETS[i];

        if (text.indexOf(t[0] + "," + t[1] + "," + t[2]) >= 0) return true;

        if (text.indexOf(t[0] + ", " + t[1] + ", " + t[2]) >= 0) return true;

    }

    const low = text.toLowerCase();

    for (let i = 0; i < TH_HEXES.length; i++) {

        if (low.indexOf(TH_HEXES[i][0]) >= 0) return true;

    }

    return false;

}


/* ---------- state ---------- */


let thPageEl = null;

let thGridEl = null;

let thCustomInput = null;

let thCustomHex = null;

let thTheme = "default";

let thCustomAccent = "#00d9ff";

let thObserver = null;

let thSweepTimer = 0;


/* ---------- data ---------- */


function thLoad() {

    try {

        const raw = localStorage.getItem(THEMES_STORE_KEY);

        if (raw) thTheme = raw;

        const cust = localStorage.getItem(THEMES_CUSTOM_KEY);

        if (thValidHex(cust)) thCustomAccent = cust.toLowerCase();

    } catch (error) {}

    if (!thDef(thTheme)) thTheme = "default";

}


function thSave() {

    try {

        localStorage.setItem(THEMES_STORE_KEY, thTheme);

    } catch (error) {}

}


function thSaveCustom() {

    try {

        localStorage.setItem(THEMES_CUSTOM_KEY, thCustomAccent);

    } catch (error) {}

}


function thDef(id) {

    for (let i = 0; i < THEME_DEFS.length; i++) {

        if (THEME_DEFS[i].id === id) {

            if (id === "custom") {

                return { id: "custom", name: "Custom", accent: thCustomAccent };

            }

            return THEME_DEFS[i];

        }

    }

    return null;

}


function thRampForTheme(id) {

    const def = thDef(id) || thDef("default");

    return thRampFor(def.accent);

}


function thCurrentRamp() {

    return thRampForTheme(thTheme);

}


/* ---------- apply pipeline ---------- */


function thApplyVars(ramp) {

    try {

        const s = document.documentElement.style;

        s.setProperty("--primary", ramp.accent);

        s.setProperty("--secondary", ramp.light);

        s.setProperty("--border", "rgba(" + ramp.accentRgb + ",0.18)");

    } catch (error) {}

}


function thCollectRules(rules) {

    let out = "";

    for (let i = 0; i < rules.length; i++) {

        const r = rules[i];

        try {

            if (r.cssRules && r.conditionText) {

                const inner = thCollectRules(r.cssRules);

                if (inner) {

                    out += "@media " + r.conditionText + " {\n" + inner + "}\n";

                }

            } else if (r.cssText) {

                if (thHasNeedle(r.cssText)) out += r.cssText + "\n";

            }

        } catch (error) {}

    }

    return out;

}


function thCollectThemedCss() {

    let out = "";

    let sheets = null;

    try {

        sheets = document.styleSheets;

    } catch (error) {

        return "";

    }

    if (!sheets) return "";

    for (let i = 0; i < sheets.length; i++) {

        const sheet = sheets[i];

        try {

            if (sheet.ownerNode && sheet.ownerNode.id === THEMES_STYLE_ID) continue;

            if (sheet.cssRules) out += thCollectRules(sheet.cssRules);

        } catch (error) {

            /* cross-origin sheet — skip */

        }

    }

    return out;

}


function thInjectSheet(cssText) {

    let el = null;

    try {

        el = document.getElementById(THEMES_STYLE_ID);

    } catch (error) {}

    if (!el) {

        el = document.createElement("style");

        el.id = THEMES_STYLE_ID;

        try {

            document.head.appendChild(el);

        } catch (error) {

            return;

        }

    }

    el.textContent = cssText;

}


function thSkipped(el) {

    try {

        return !!(el.closest && el.closest("[" + THEMES_SKIP_ATTR + "]"));

    } catch (error) {

        return false;

    }

}


function thSweepOne(el, ramp) {

    if (!el || el.id === THEMES_STYLE_ID || thSkipped(el)) return;

    let cur = null;

    try {

        cur = el.getAttribute("style");

    } catch (error) {

        return;

    }

    if (!cur || !thHasNeedle(cur)) return;

    try {

        el.setAttribute(THEMES_ORIG_ATTR, cur);

        el.setAttribute("style", thRewriteColors(cur, ramp));

    } catch (error) {}

}


function thSweepInline(ramp) {

    let els = null;

    try {

        els = document.querySelectorAll("[style]");

    } catch (error) {

        return;

    }

    for (let i = 0; i < els.length; i++) thSweepOne(els[i], ramp);

    try {

        thSweepOne(document.documentElement, ramp);

    } catch (error) {}

}


function thRestoreInline() {

    let els = null;

    try {

        els = document.querySelectorAll("[" + THEMES_ORIG_ATTR + "]");

    } catch (error) {

        return;

    }

    for (let i = 0; i < els.length; i++) {

        const el = els[i];

        try {

            el.setAttribute("style", el.getAttribute(THEMES_ORIG_ATTR));

            el.removeAttribute(THEMES_ORIG_ATTR);

        } catch (error) {}

    }

}


function thApplyPipeline(ramp) {

    thRestoreInline();

    thApplyVars(ramp);

    thInjectSheet(thRewriteColors(thCollectThemedCss(), ramp));

    thSweepInline(ramp);

}


/* ---------- public API (all th-prefixed — no globals leak) ---------- */


function thApplyTheme(id, save) {

    const def = thDef(id) || thDef("default");

    thTheme = def.id;

    if (save !== false) thSave();

    thApplyPipeline(thRampFor(def.accent));

    try {

        Aegis.broadcast("themeChanged", { theme: thTheme });

    } catch (error) {}

    thRefresh();

    return thTheme;

}


function thCurrentTheme() {

    return thTheme;

}


function thListThemes() {

    return THEME_DEFS.map((d) => d.id);

}


function thSetCustom(hex) {

    if (!thValidHex(hex)) return thTheme;

    thCustomAccent = hex.toLowerCase();

    thSaveCustom();

    return thApplyTheme("custom");

}


function thPreviewCustom(hex) {

    if (!thValidHex(hex)) return;

    thApplyPipeline(thRampFor(hex.toLowerCase()));

    if (thCustomHex) thCustomHex.textContent = hex.toLowerCase();

}


/* ---------- live re-theme watcher ---------- */


function thWatch() {

    if (thObserver) return;

    let MO = null;

    try {

        MO = MutationObserver;

    } catch (error) {

        return;

    }

    if (!MO) return;

    try {

        thObserver = new MO((muts) => {

            let dirty = false;

            for (let i = 0; i < muts.length && !dirty; i++) {

                const m = muts[i];

                if (m.type === "attributes" && m.attributeName === "style") {

                    const t = m.target;

                    if (t && t.id !== THEMES_STYLE_ID && !thSkipped(t)) {

                        let s = null;

                        try {

                            s = t.getAttribute("style");

                        } catch (error) {}

                        if (s && thHasNeedle(s)) dirty = true;

                    }

                } else if (m.type === "childList" && m.addedNodes) {

                    for (let j = 0; j < m.addedNodes.length && !dirty; j++) {

                        const n = m.addedNodes[j];

                        if (n && n.nodeType === 1 &&
                            n.id !== THEMES_STYLE_ID && !thSkipped(n)) {

                            let s = null;

                            try {

                                s = n.getAttribute("style");

                            } catch (error) {}

                            if (s && thHasNeedle(s)) {

                                dirty = true;

                                break;

                            }

                            try {

                                const inner = n.querySelectorAll("[style]");

                                for (let k = 0; k < inner.length; k++) {

                                    const q = inner[k];

                                    if (q.id === THEMES_STYLE_ID || thSkipped(q)) continue;

                                    let qs = null;

                                    try {

                                        qs = q.getAttribute("style");

                                    } catch (error) {}

                                    if (qs && thHasNeedle(qs)) {

                                        dirty = true;

                                        break;

                                    }

                                }

                            } catch (error) {}

                        }

                    }

                }

            }

            if (dirty) {

                try {

                    clearTimeout(thSweepTimer);

                } catch (error) {}

                thSweepTimer = setTimeout(

                    () => thSweepInline(thCurrentRamp()),

                    80

                );

            }

        });

        thObserver.observe(document.documentElement, {

            childList: true,

            subtree: true,

            attributes: true,

            attributeFilter: ["style"]

        });

    } catch (error) {

        thObserver = null;

    }

}


function thUnwatch() {

    try {

        if (thSweepTimer) clearTimeout(thSweepTimer);

        if (thObserver) thObserver.disconnect();

    } catch (error) {}

    thObserver = null;

}


/* ---------- nav glue ---------- */


function thNav() {

    try {

        if (typeof Aegis !== "undefined" && Aegis.getModule) {

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

        const on = page.dataset && page.dataset.page === name;

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

        if (hubList.querySelector('[data-goto-page="' + THEMES_PAGE + '"]')) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", THEMES_PAGE);

        item.textContent = "🎨 Dashboard Themes";

        item.addEventListener("click", thOpen);

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


function thOpen() {

    thShowPage(THEMES_PAGE);

}


function thRefresh() {

    if (thCustomInput) {

        try {

            thCustomInput.value = thCustomAccent;

        } catch (error) {}

    }

    if (thCustomHex) {

        thCustomHex.textContent =
            thCustomAccent + (thTheme === "custom" ? " ✓" : "");

    }

    if (!thGridEl) return;

    thGridEl.innerHTML = "";

    THEME_DEFS.forEach((def) => {

        if (def.id === "custom") return;

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

            background: def.accent,

            border: "1px solid rgba(255,255,255,0.35)",

            flexShrink: "0"

        });

        const label = document.createElement("span");

        label.textContent = def.name + (active ? " ✓" : "");

        btn.appendChild(dot);

        btn.appendChild(label);

        btn.addEventListener("click", () => thApplyTheme(def.id));

        thGridEl.appendChild(btn);

    });

}


function thBuildPage() {

    thPageEl = document.createElement("div");

    thPageEl.className = "aegis-page";

    thPageEl.dataset.page = THEMES_PAGE;

    /* The settings page keeps its own chrome — it is never
       swept, so the preset swatches always show true colors. */

    thPageEl.setAttribute(THEMES_SKIP_ATTR, "1");

    /* Constrain the page to the dashboard's centered column
       instead of stretching full-bleed edge to edge. */

    thStyle(thPageEl, {

        width: "min(1200px, 92%)",

        margin: "0 auto"

    });

    const back = document.createElement("button");

    back.className = "aegis-page-back";

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
        "Real theming — recolors the dashboard's actual palette. " +
        "Your choice is saved automatically.";

    thStyle(note, {

        fontSize: "11px",

        color: "rgba(159, 220, 255, 0.55)",

        marginBottom: "12px"

    });

    card.appendChild(note);

    thGridEl = document.createElement("div");

    card.appendChild(thGridEl);

    /* ---- custom color wheel ---- */

    const customWrap = document.createElement("div");

    thStyle(customWrap, {

        marginTop: "14px",

        paddingTop: "12px",

        borderTop: "1px solid rgba(159,220,255,0.15)"

    });

    const customLabel = document.createElement("div");

    customLabel.textContent = "Custom color";

    thStyle(customLabel, {

        fontSize: "13px",

        color: "#9fdcff",

        marginBottom: "8px"

    });

    customWrap.appendChild(customLabel);

    const row = document.createElement("div");

    thStyle(row, {

        display: "flex",

        alignItems: "center",

        gap: "12px"

    });

    thCustomInput = document.createElement("input");

    thCustomInput.type = "color";

    thCustomInput.value = thCustomAccent;

    thCustomInput.setAttribute("aria-label", "Pick a custom accent color");

    thStyle(thCustomInput, {

        width: "44px",

        height: "44px",

        border: "none",

        borderRadius: "50%",

        padding: "0",

        background: "none",

        cursor: "pointer",

        flexShrink: "0"

    });

    thCustomInput.addEventListener("input", () => thPreviewCustom(thCustomInput.value));

    thCustomInput.addEventListener("change", () => thSetCustom(thCustomInput.value));

    row.appendChild(thCustomInput);

    thCustomHex = document.createElement("span");

    thCustomHex.textContent = thCustomAccent;

    thStyle(thCustomHex, {

        fontSize: "13px",

        color: "#9fdcff",

        fontFamily: "monospace"

    });

    row.appendChild(thCustomHex);

    const hint = document.createElement("div");

    hint.textContent = "Pick any color — the whole dashboard follows it.";

    thStyle(hint, {

        fontSize: "11px",

        color: "rgba(159, 220, 255, 0.55)"

    });

    row.appendChild(hint);

    customWrap.appendChild(row);

    card.appendChild(customWrap);

    thPageEl.appendChild(card);

    document.body.appendChild(thPageEl);

}


Aegis.register("themes", {

    version: "1.0.0",

    name: "Dashboard Themes",


    apply: function (id) {

        return thApplyTheme(id);

    },

    current: function () {

        return thCurrentTheme();

    },

    list: function () {

        return thListThemes();

    },

    open: function () {

        return thOpen();

    },

    refresh: function () {

        return thRefresh();

    },

    setCustom: function (hex) {

        return thSetCustom(hex);

    },

    customAccent: function () {

        return thCustomAccent;

    },


    init() {

        thLoad();

        /* Neutralize the v0.1.0 stand-in filter so it never stacks. */

        try {

            document.documentElement.style.filter = "";

        } catch (error) {}

        thBuildPage();

        thAddMoreEntry();

        thApplyTheme(thTheme, false);

        thWatch();

        if (!thHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (thHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        console.log("Dashboard Themes v1.0.0 initialized.");

    },


    shutdown() {

        thUnwatch();

        thRestoreInline();

        try {

            const el = document.getElementById(THEMES_STYLE_ID);

            if (el && el.parentNode) el.parentNode.removeChild(el);

        } catch (error) {}

        try {

            const s = document.documentElement.style;

            s.removeProperty("--primary");

            s.removeProperty("--secondary");

            s.removeProperty("--border");

        } catch (error) {}

        if (thPageEl && thPageEl.parentNode) {

            try {

                thPageEl.parentNode.removeChild(thPageEl);

            } catch (error) {}

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

        thGridEl = null;

        thCustomInput = null;

        thCustomHex = null;

        console.log("Dashboard Themes v1.0.0 shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            theme: thTheme

        };

    }

});
