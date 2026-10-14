/*======================================

        AEGIS FOCUS TRACKER v1.0.0

        Polished module. Reads the session log the Focus
        module already keeps in localStorage
        ("aegisFocusSessions") — {startedAt, minutes, label,
        completed} — and turns it into a real tracker page:

        - Stats header: this-week minutes, week sessions,
          best day-streak, all-time minutes
        - 7-day bar chart (CSS, no libs)
        - Top labels by minutes
        - Full session history grouped by day, with
          per-session delete and two-tap clear-all

        Backward compatible with the v0.1.0 stand-in and
        the focus.js session shape. Same localStorage
        key/shape; nothing to migrate.

        Page lives in the More hub, like Prayer Journal.
        Refreshes automatically when a focus session ends.

        Cache-busted filename (focus-tracker-1.0.0.js) so
        phones with stale caches pick it up.

======================================*/


const FT_PAGE = "focustracker";

const FT_STORE_KEY = "aegisFocusSessions";


let ftPageEl = null;

let ftStatsEl = null;

let ftChartEl = null;

let ftLabelsEl = null;

let ftListEl = null;

let ftEmptyHintEl = null;

let ftClearSlotEl = null;


/* ==================== data ==================== */


function ftLoadSessions() {

    try {

        const raw = localStorage.getItem(FT_STORE_KEY);

        if (!raw) return [];

        const ftListSessions = JSON.parse(raw);

        return Array.isArray(ftListSessions) ? ftListSessions : [];

    } catch (error) {

        return [];

    }

}


function ftSaveSessions(ftListSessions) {

    try {

        localStorage.setItem(FT_STORE_KEY, JSON.stringify(ftListSessions));

    } catch (error) {}

}


function ftDayKey(d) {

    const dt = d instanceof Date ? d : new Date(d);

    if (isNaN(dt.getTime())) return null;

    return dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2, "0") + "-" +
        String(dt.getDate()).padStart(2, "0");

}


function ftTodayKey() {

    return ftDayKey(new Date());

}


function ftWeekStart() {

    const d = new Date();

    d.setHours(0, 0, 0, 0);

    /* Monday as week start. */

    const dow = (d.getDay() + 6) % 7;

    d.setDate(d.getDate() - dow);

    return d;

}


function ftOnDay(s, key) {

    return !!(s && ftDayKey(s.startedAt) === key);

}


function ftGetToday() {

    const key = ftTodayKey();

    const ftListSessions = ftLoadSessions().filter((s) => ftOnDay(s, key));

    return {

        sessions: ftListSessions.length,

        minutes: ftListSessions.reduce((t, s) => t + (s.minutes || 0), 0),

        completed: ftListSessions.filter((s) => s.completed).length

    };

}


function ftGetWeek() {

    const start = ftWeekStart().getTime();

    const ftListSessions = ftLoadSessions().filter((s) => {

        const t = new Date(s && s.startedAt).getTime();

        return !isNaN(t) && t >= start;

    });

    return {

        sessions: ftListSessions.length,

        minutes: ftListSessions.reduce((t, s) => t + (s.minutes || 0), 0),

        completed: ftListSessions.filter((s) => s.completed).length

    };

}


function ftGetAllTime() {

    const ftListSessions = ftLoadSessions();

    return {

        sessions: ftListSessions.length,

        minutes: ftListSessions.reduce((t, s) => t + (s.minutes || 0), 0),

        completed: ftListSessions.filter((s) => s.completed).length

    };

}


/* Consecutive calendar days (ending today, or yesterday if
   today has no completed session yet) with at least one
   completed focus session. */

function ftGetStreak() {

    const completedDays = {};

    ftLoadSessions().forEach((s) => {

        if (s && s.completed) {

            const key = ftDayKey(s.startedAt);

            if (key) completedDays[key] = true;

        }

    });

    let streak = 0;

    const d = new Date();

    d.setHours(0, 0, 0, 0);

    /* If today has nothing completed yet, the streak may
       still be alive through yesterday. */

    if (!completedDays[ftDayKey(d)]) {

        d.setDate(d.getDate() - 1);

    }

    while (completedDays[ftDayKey(d)]) {

        streak += 1;

        d.setDate(d.getDate() - 1);

    }

    return streak;

}


/* Minutes per day for the last n days, oldest first.
   [{key, label("Mon"), minutes}]. */

function ftGetDailyMinutes(n) {

    const days = [];

    const now = new Date();

    now.setHours(0, 0, 0, 0);

    for (let i = n - 1; i >= 0; i--) {

        const d = new Date(now);

        d.setDate(d.getDate() - i);

        days.push({

            key: ftDayKey(d),

            label: d.toLocaleDateString([], { weekday: "short" }),

            minutes: 0

        });

    }

    const byKey = {};

    days.forEach((day) => { byKey[day.key] = day; });

    ftLoadSessions().forEach((s) => {

        const key = s && ftDayKey(s.startedAt);

        if (key && byKey[key]) {

            byKey[key].minutes += (s.minutes || 0);

        }

    });

    return days;

}


/* Top labels by minutes within the current week,
   [{label, minutes}]. */

function ftGetTopLabels(limit) {

    const start = ftWeekStart().getTime();

    const byLabel = {};

    ftLoadSessions().forEach((s) => {

        if (!s) return;

        const t = new Date(s.startedAt).getTime();

        if (isNaN(t) || t < start) return;

        const name = (s.label || "untitled").trim() || "untitled";

        byLabel[name] = (byLabel[name] || 0) + (s.minutes || 0);

    });

    return Object.keys(byLabel)

        .map((name) => ({ label: name, minutes: byLabel[name] }))

        .sort((a, b) => b.minutes - a.minutes)

        .slice(0, limit || 3);

}


function ftListSessions() {

    return ftLoadSessions().slice().reverse();

}


/* ==================== nav glue ==================== */


function ftNav() {

    try {

        if (typeof Aegis !== "undefined" && Aegis.getModule) {

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

        const on = page.dataset && page.dataset.page === name;

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
            '[data-goto-page="' + FT_PAGE + '"]'
        )) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", FT_PAGE);

        item.textContent = "📊 Focus Tracker";

        item.addEventListener("click", ftOpen);

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


function ftEl(tag, text, styles) {

    const el = document.createElement(tag);

    if (text !== undefined && text !== null) {

        el.textContent = text;

    }

    if (styles) ftStyle(el, styles);

    return el;

}


/* ==================== page ==================== */


function ftStat(label, value) {

    const box = ftEl("div", null, {

        flex: "1",

        minWidth: "72px",

        textAlign: "center",

        padding: "10px 6px",

        borderRadius: "12px",

        background: "rgba(80, 210, 255, 0.07)",

        border: "1px solid rgba(80, 210, 255, 0.25)"

    });

    const v = ftEl("div", String(value), {

        fontSize: "22px",

        fontWeight: "bold",

        color: "#9fdcff"

    });

    const l = ftEl("div", label, {

        fontSize: "10px",

        letterSpacing: "1px",

        color: "rgba(159, 220, 255, 0.6)",

        marginTop: "2px"

    });

    box.appendChild(v);

    box.appendChild(l);

    return box;

}


function ftSectionTitle(text) {

    return ftEl("h3", text, {

        fontSize: "13px",

        color: "#9fdcff",

        margin: "14px 0 8px"

    });

}


function ftRenderStats() {

    ftStatsEl.innerHTML = "";

    const week = ftGetWeek();

    const streak = ftGetStreak();

    const all = ftGetAllTime();

    const row = ftEl("div", null, {

        display: "flex",

        gap: "8px",

        marginBottom: "4px"

    });

    row.appendChild(ftStat("WEEK (MIN)", week.minutes));

    row.appendChild(ftStat("WEEK SESSIONS", week.sessions));

    row.appendChild(ftStat("BEST STREAK", streak + "d"));

    ftStatsEl.appendChild(row);

    const row2 = ftEl("div", null, {

        display: "flex",

        gap: "8px",

        marginBottom: "4px"

    });

    row2.appendChild(ftStat("WEEK DONE", week.completed));

    row2.appendChild(ftStat("ALL-TIME (MIN)", all.minutes));

    row2.appendChild(ftStat("ALL SESSIONS", all.sessions));

    ftStatsEl.appendChild(row2);

}


function ftRenderChart() {

    ftChartEl.innerHTML = "";

    const days = ftGetDailyMinutes(7);

    const max = Math.max.apply(null,
        days.map((d) => d.minutes).concat([1]));

    const wrap = ftEl("div", null, {

        display: "flex",

        alignItems: "flex-end",

        gap: "6px",

        height: "110px",

        padding: "6px 2px 0"

    });

    days.forEach((day) => {

        const col = ftEl("div", null, {

            flex: "1",

            display: "flex",

            flexDirection: "column",

            alignItems: "center",

            justifyContent: "flex-end",

            height: "100%"

        });

        const val = day.minutes > 0 ? String(day.minutes) : "";

        const vlabel = ftEl("div", val, {

            fontSize: "9px",

            color: "rgba(159, 220, 255, 0.75)",

            marginBottom: "2px",

            minHeight: "11px"

        });

        const bar = ftEl("div", null, {

            width: "70%",

            borderRadius: "5px",

            background: day.minutes > 0
                ? "linear-gradient(180deg, #50d2ff, #1e7fb8)"
                : "rgba(80, 210, 255, 0.10)",

            height: Math.max(day.minutes / max * 76, 4) + "px"

        });

        const dlabel = ftEl("div", day.label, {

            fontSize: "9px",

            color: "rgba(159, 220, 255, 0.55)",

            marginTop: "3px"

        });

        col.appendChild(vlabel);

        col.appendChild(bar);

        col.appendChild(dlabel);

        wrap.appendChild(col);

    });

    ftChartEl.appendChild(wrap);

}


function ftRenderLabels() {

    ftLabelsEl.innerHTML = "";

    const tops = ftGetTopLabels(3);

    if (!tops.length) {

        ftLabelsEl.appendChild(ftEl("div",
            "No labeled sessions this week yet.", {

                fontSize: "12px",

                color: "rgba(159, 220, 255, 0.6)",

                padding: "2px 0 4px"

            }));

        return;

    }

    tops.forEach((t, i) => {

        const row = ftEl("div", null, {

            display: "flex",

            justifyContent: "space-between",

            fontSize: "12px",

            color: "#9fdcff",

            padding: "5px 0",

            borderBottom: "1px solid rgba(80, 210, 255, 0.12)"

        });

        row.appendChild(ftEl("span",
            (i + 1) + ". " + t.label));

        row.appendChild(ftEl("span", t.minutes + " min"));

        ftLabelsEl.appendChild(row);

    });

}


function ftFormatTime(ts) {

    const d = new Date(ts);

    if (isNaN(d.getTime())) return "";

    let h = d.getHours();

    const m = String(d.getMinutes()).padStart(2, "0");

    const ap = h >= 12 ? "PM" : "AM";

    h = h % 12 || 12;

    return h + ":" + m + " " + ap;

}


function ftDeleteSession(indexFromEnd) {

    /* indexFromEnd: 0 = newest. */

    const ftListSessions = ftLoadSessions();

    const idx = ftListSessions.length - 1 - indexFromEnd;

    if (idx < 0 || idx >= ftListSessions.length) return;

    ftListSessions.splice(idx, 1);

    ftSaveSessions(ftListSessions);

    ftRefresh();

}


let ftClearArmed = false;

let ftClearTimer = null;


function ftRenderList() {

    ftListEl.innerHTML = "";

    const sessions = ftListSessions();

    if (!sessions.length) {

        ftEmptyHintEl.textContent =
            "No focus sessions yet — hit FOCUS and get one in.";

        ftEmptyHintEl.style.display = "";

        return;

    }

    ftEmptyHintEl.style.display = "none";

    let lastDay = null;

    sessions.forEach((s, i) => {

        const dayKey = ftDayKey(s.startedAt);

        const d = new Date(s.startedAt);

        const dayLabel = isNaN(d.getTime())
            ? "Unknown date"
            : d.toLocaleDateString([], {

                weekday: "short",

                month: "short",

                day: "numeric"

            });

        if (dayKey !== lastDay) {

            lastDay = dayKey;

            ftListEl.appendChild(ftSectionTitle(dayLabel));

        }

        const row = ftEl("div", null, {

            display: "flex",

            alignItems: "center",

            gap: "8px",

            fontSize: "12px",

            color: "#9fdcff",

            padding: "6px 0",

            borderBottom: "1px solid rgba(80, 210, 255, 0.12)"

        });

        const badge = ftEl("span", s.completed ? "✓" : "◐", {

            fontSize: "13px",

            color: s.completed ? "#7dffa8" : "#ffd37d",

            minWidth: "16px",

            textAlign: "center"

        });

        const mid = ftEl("span", null, { flex: "1" });

        mid.appendChild(ftEl("span",
            ftFormatTime(s.startedAt) + "  " +
            ((s.label || "untitled").trim() || "untitled"), {

                display: "block"

            }));

        const right = ftEl("span", (s.minutes || 0) + " min", {

            color: "rgba(159, 220, 255, 0.7)"

        });

        const del = ftEl("button", "×", {

            background: "transparent",

            border: "none",

            color: "rgba(255, 120, 120, 0.65)",

            fontSize: "15px",

            cursor: "pointer",

            padding: "2px 6px",

            width: "auto"

        });

        del.setAttribute("aria-label", "Delete session");

        del.addEventListener("click", () => ftDeleteSession(i));

        row.appendChild(badge);

        row.appendChild(mid);

        row.appendChild(right);

        row.appendChild(del);

        ftListEl.appendChild(row);

    });

}


function ftDisarmClear() {

    ftClearArmed = false;

    if (ftClearTimer) {

        clearTimeout(ftClearTimer);

        ftClearTimer = null;

    }

    ftRefresh();

}


function ftClearButton() {

    const btn = ftEl("button",
        ftClearArmed ? "Tap again to wipe all history" : "Clear history", {

            width: "100%",

            marginTop: "14px",

            padding: "9px",

            borderRadius: "10px",

            border: "1px solid " + (ftClearArmed
                ? "rgba(255, 120, 120, 0.7)"
                : "rgba(255, 120, 120, 0.3)"),

            background: ftClearArmed
                ? "rgba(255, 120, 120, 0.15)"
                : "transparent",

            color: "rgba(255, 150, 150, 0.9)",

            fontSize: "12px",

            cursor: "pointer"

        });

    btn.addEventListener("click", () => {

        if (!ftClearArmed) {

            ftClearArmed = true;

            ftRefresh();

            ftClearTimer = setTimeout(ftDisarmClear, 4000);

            return;

        }

        ftDisarmClear();

        ftSaveSessions([]);

        ftRefresh();

    });

    return btn;

}


/* ==================== ftRefresh + page ==================== */


function ftOpen() {

    ftRefresh();

    ftShowPage(FT_PAGE);

}


function ftRefresh() {

    if (!ftStatsEl) return;

    ftRenderStats();

    ftRenderChart();

    ftRenderLabels();

    ftRenderList();

    /* Rebuild the clear button here so its armed/disarmed
       state is always visible. */

    if (ftClearSlotEl) {

        ftClearSlotEl.innerHTML = "";

        ftClearSlotEl.appendChild(ftClearButton());

    }

}


function ftBuildPage() {

    ftPageEl = document.createElement("div");

    ftPageEl.className = "aegis-page";

    ftPageEl.dataset.page = FT_PAGE;

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

    /* Row: title + ftRefresh button. */

    const headRow = ftEl("div", null, {

        display: "flex",

        alignItems: "center",

        justifyContent: "space-between",

        marginBottom: "6px"

    });

    const refresher = ftEl("button", "↻ Refresh", {

        width: "auto",

        padding: "6px 12px",

        borderRadius: "10px",

        border: "1px solid rgba(80, 210, 255, 0.35)",

        background: "rgba(80, 210, 255, 0.08)",

        color: "#9fdcff",

        fontSize: "12px",

        cursor: "pointer"

    });

    refresher.addEventListener("click", ftRefresh);

    headRow.appendChild(ftEl("span", "Your focus history", {

        fontSize: "12px",

        color: "rgba(159, 220, 255, 0.6)"

    }));

    headRow.appendChild(refresher);

    card.appendChild(headRow);

    ftStatsEl = document.createElement("div");

    card.appendChild(ftStatsEl);

    card.appendChild(ftSectionTitle("Last 7 days"));

    ftChartEl = document.createElement("div");

    card.appendChild(ftChartEl);

    card.appendChild(ftSectionTitle("Top labels this week"));

    ftLabelsEl = document.createElement("div");

    card.appendChild(ftLabelsEl);

    card.appendChild(ftSectionTitle("Session history"));

    ftEmptyHintEl = ftEl("div", "", {

        fontSize: "12px",

        color: "rgba(159, 220, 255, 0.6)",

        padding: "4px 0"

    });

    card.appendChild(ftEmptyHintEl);

    ftListEl = document.createElement("div");

    card.appendChild(ftListEl);

    /* The clear button re-renders on arm/disarm inside
       ftRefresh(), so it lives in its own slot. */

    ftClearSlotEl = document.createElement("div");

    card.appendChild(ftClearSlotEl);

    ftPageEl.appendChild(card);

    document.body.appendChild(ftPageEl);

}


let ftUnsub = null;


Aegis.register("focustracker", {

    version: "1.0.0",

    name: "Focus Tracker",


    getToday: ftGetToday,

    getWeek: ftGetWeek,

    getAllTime: ftGetAllTime,

    getStreak: ftGetStreak,

    getDailyMinutes: ftGetDailyMinutes,

    getTopLabels: ftGetTopLabels,

    list: ftListSessions,

    open: ftOpen,

    refresh: ftRefresh,


    init() {

        ftBuildPage();

        ftAddMoreEntry();

        ftRefresh();

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

            ftUnsub = Aegis.listen("focusEnded", ftRefresh);

        } catch (error) {}

        console.log("Focus Tracker v1.0.0 initialized.");

    },


    ftRefresh() {

        ftRefresh();

    },


    shutdown() {

        if (ftPageEl && ftPageEl.parentNode) {

            ftPageEl.parentNode.removeChild(ftPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="' +
                FT_PAGE + '"]'
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

        console.log("Focus Tracker shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            sessions: ftLoadSessions().length

        };

    }

});
