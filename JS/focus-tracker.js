/*======================================

        AEGIS FOCUS TRACKER v0.1.0

        STAND-IN module (unpolished). Reads the session log
        that the Focus module already keeps in localStorage
        ("aegisFocusSessions") and shows simple stats: today,
        this week, all time, plus recent sessions.

        Page lives in the More hub, like Prayer Journal.
        Refreshes whenever a focus session ends.

======================================*/


const FOCUS_TRACKER_PAGE = "focustracker";

const FOCUS_SESSIONS_KEY = "aegisFocusSessions";


let ftPageEl = null;

let ftStatsEl = null;

let ftListEl = null;


/* ---------- data ---------- */


function ftLoadSessions() {

    try {

        const raw = localStorage.getItem(FOCUS_SESSIONS_KEY);

        if (!raw) return [];

        const list = JSON.parse(raw);

        return Array.isArray(list) ? list : [];

    } catch (error) {

        return [];

    }

}


function ftDayKey(d) {

    const dt = d instanceof Date ? d : new Date(d);

    return dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2, "0") + "-" +
        String(dt.getDate()).padStart(2, "0");

}


function ftWeekStart() {

    const d = new Date();

    d.setHours(0, 0, 0, 0);

    /* Monday as week start. */

    const dow = (d.getDay() + 6) % 7;

    d.setDate(d.getDate() - dow);

    return d;

}


function getToday() {

    const key = ftDayKey(new Date());

    const list = ftLoadSessions().filter((s) => {

        return s && ftDayKey(s.startedAt) === key;

    });

    return {

        sessions: list.length,

        minutes: list.reduce((t, s) => t + (s.minutes || 0), 0)

    };

}


function getWeek() {

    const start = ftWeekStart().getTime();

    const list = ftLoadSessions().filter((s) => {

        return s && new Date(s.startedAt).getTime() >= start;

    });

    return {

        sessions: list.length,

        minutes: list.reduce((t, s) => t + (s.minutes || 0), 0),

        completed: list.filter((s) => s.completed).length

    };

}


function getAllTime() {

    const list = ftLoadSessions();

    return {

        sessions: list.length,

        minutes: list.reduce((t, s) => t + (s.minutes || 0), 0),

        completed: list.filter((s) => s.completed).length

    };

}


function list() {

    return ftLoadSessions().slice().reverse();

}


/* ---------- nav glue ---------- */


function ftNav() {

    try {

        if (typeof Aegis !== "undefined" &&
            Aegis.getModule) {

            const mod = Aegis.getModule("navigation");

            if (mod && mod.api) return mod.api;

        }

    } catch (error) {}

    return null;

}


function ftShowPage(name) {

    const nav = ftNav();

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


function ftGoMore() {

    ftShowPage("more");

}


function ftHookNavigation() {

    const nav = ftNav();

    if (!nav || !ftPageEl) return false;

    try {

        if (nav._els && Array.isArray(nav._els.pages)) {

            if (nav._els.pages.indexOf(ftPageEl) < 0) {

                nav._els.pages.push(ftPageEl);

            }

            return true;

        }

    } catch (error) {}

    return false;

}


function ftAddMoreEntry() {

    try {

        const hubList = document.querySelector(".aegis-more-list");

        if (!hubList) return false;

        if (hubList.querySelector(
            '[data-goto-page="' + FOCUS_TRACKER_PAGE + '"]'
        )) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", FOCUS_TRACKER_PAGE);

        item.textContent = "📊 Focus Tracker";

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


function ftStyle(el, styles) {

    try {

        Object.assign(el.style, styles);

    } catch (error) {}

}


/* ---------- page ---------- */


function ftStat(label, value) {

    const box = document.createElement("div");

    ftStyle(box, {

        flex: "1",

        minWidth: "80px",

        textAlign: "center",

        padding: "10px 6px",

        borderRadius: "12px",

        background: "rgba(80, 210, 255, 0.07)",

        border: "1px solid rgba(80, 210, 255, 0.25)"

    });

    const v = document.createElement("div");

    v.textContent = String(value);

    ftStyle(v, {

        fontSize: "20px",

        fontWeight: "bold",

        color: "#9fdcff"

    });

    const l = document.createElement("div");

    l.textContent = label;

    ftStyle(l, {

        fontSize: "10px",

        letterSpacing: "1px",

        color: "rgba(159, 220, 255, 0.6)",

        marginTop: "2px"

    });

    box.appendChild(v);

    box.appendChild(l);

    return box;

}


function open() {

    refresh();

    ftShowPage(FOCUS_TRACKER_PAGE);

}


function refresh() {

    if (!ftStatsEl || !ftListEl) return;

    const today = getToday();

    const week = getWeek();

    const all = getAllTime();

    ftStatsEl.innerHTML = "";

    const row1 = document.createElement("div");

    ftStyle(row1, {

        display: "flex",

        gap: "8px",

        marginBottom: "8px"

    });

    row1.appendChild(ftStat("TODAY (MIN)", today.minutes));

    row1.appendChild(ftStat("TODAY (SESSIONS)", today.sessions));

    const row2 = document.createElement("div");

    ftStyle(row2, {

        display: "flex",

        gap: "8px",

        marginBottom: "12px"

    });

    row2.appendChild(ftStat("WEEK (MIN)", week.minutes));

    row2.appendChild(ftStat("WEEK DONE", week.completed));

    row2.appendChild(ftStat("ALL-TIME (MIN)", all.minutes));

    ftStatsEl.appendChild(row1);

    ftStatsEl.appendChild(row2);

    ftListEl.innerHTML = "";

    const sessions = list().slice(0, 10);

    if (!sessions.length) {

        const empty = document.createElement("div");

        empty.textContent =
            "No focus sessions yet — hit FOCUS and get one in.";

        ftStyle(empty, {

            fontSize: "12px",

            color: "rgba(159, 220, 255, 0.6)",

            padding: "8px 0"

        });

        ftListEl.appendChild(empty);

        return;

    }

    sessions.forEach((s) => {

        const row = document.createElement("div");

        ftStyle(row, {

            display: "flex",

            justifyContent: "space-between",

            fontSize: "12px",

            color: "#9fdcff",

            padding: "6px 0",

            borderBottom: "1px solid rgba(80, 210, 255, 0.12)"

        });

        const left = document.createElement("span");

        const d = new Date(s.startedAt);

        left.textContent = (s.completed ? "✓ " : "◐ ") +
            d.toLocaleDateString([], {
                month: "short",
                day: "numeric"
            }) + " — " + (s.label || "untitled");

        const right = document.createElement("span");

        right.textContent = (s.minutes || 0) + " min";

        row.appendChild(left);

        row.appendChild(right);

        ftListEl.appendChild(row);

    });

}


function ftBuildPage() {

    ftPageEl = document.createElement("div");

    ftPageEl.className = "aegis-page";

    ftPageEl.dataset.page = FOCUS_TRACKER_PAGE;

    const back = document.createElement("button");

    back.className = "aegis-page-back";

    back.setAttribute("data-back-to", "more");

    back.textContent = "← Back to More";

    back.addEventListener("click", ftGoMore);

    ftPageEl.appendChild(back);

    const card = document.createElement("section");

    card.className = "card";

    const h2 = document.createElement("h2");

    h2.textContent = "📊 Focus Tracker";

    card.appendChild(h2);

    ftStatsEl = document.createElement("div");

    card.appendChild(ftStatsEl);

    const h3 = document.createElement("h3");

    h3.textContent = "Recent sessions";

    ftStyle(h3, {

        fontSize: "13px",

        color: "#9fdcff",

        margin: "4px 0 6px"

    });

    card.appendChild(h3);

    ftListEl = document.createElement("div");

    card.appendChild(ftListEl);

    ftPageEl.appendChild(card);

    document.body.appendChild(ftPageEl);

}


let ftUnsub = null;


Aegis.register("focustracker", {

    version: "0.1.0",

    name: "Focus Tracker (stand-in)",


    getToday,

    getWeek,

    getAllTime,

    list,

    open,

    refresh,


    init() {

        ftBuildPage();

        ftAddMoreEntry();

        refresh();

        if (!ftHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (ftHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        try {

            if (ftUnsub) ftUnsub();

            ftUnsub = Aegis.listen("focusEnded", refresh);

        } catch (error) {}

        console.log("Focus Tracker (stand-in) initialized.");

    },


    refresh() {

        refresh();

    },


    shutdown() {

        if (ftPageEl && ftPageEl.parentNode) {

            ftPageEl.parentNode.removeChild(ftPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="' +
                FOCUS_TRACKER_PAGE + '"]'
            );

            if (entry && entry.parentNode) {

                entry.parentNode.removeChild(entry);

            }

        } catch (error) {}

        if (ftUnsub) {

            ftUnsub();

            ftUnsub = null;

        }

        ftPageEl = null;

        console.log("Focus Tracker (stand-in) shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            sessions: ftLoadSessions().length

        };

    }

});
