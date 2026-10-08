/*======================================

        AEGIS HABIT TRACKER v1.1.0

        Add habits, check them off each day, watch streaks
        grow. Week-at-a-glance dots, tap any dot to fix a
        missed day, rename inline, stats header.

        Everything lives in localStorage ("aegisHabits").

        Lives on the HOME page as a dashboard card
        (#card-habits in .dashboard-grid) — not in More.

        v0.1.0: stand-in — add/toggle/delete + streaks.
        v1.0.0: polished — stats header, 7-day dots with
                backfill, inline rename.
        v1.1.0: moved out of the More hub onto the home
                dashboard as a full-width card.
        v1.1.1: registers the card in the dashboard layout
                and re-pins it last, so renderLayout() can't
                strand it at the top of the grid.
        v1.1.2: refresh() failures now render a visible
                error inside the card instead of failing
                silently.
        v1.1.3: temporary render diagnostics.
        v1.1.4: DOM write-method probe.
        v1.1.5: renders stats + habit rows via innerHTML
                with one delegated click handler, after
                proving appendChild silently drops nodes in
                this host page while innerHTML works.

======================================*/


const HABITS_CARD_ID = "card-habits";

const HABITS_STORE_KEY = "aegisHabits";


let hbCardEl = null;

let hbStatsEl = null;

let hbListEl = null;

let hbInputEl = null;


/* ---------- data ---------- */


function hbLoad() {

    try {

        const raw = localStorage.getItem(HABITS_STORE_KEY);

        if (!raw) return [];

        const list = JSON.parse(raw);

        if (!Array.isArray(list)) return [];

        /* Drop corrupt entries (null, non-objects) so one bad
           habit can't break the whole render. */

        return list.filter((h) => h && typeof h === "object");

    } catch (error) {

        return [];

    }

}


function hbSave(list) {

    try {

        localStorage.setItem(
            HABITS_STORE_KEY,
            JSON.stringify(list)
        );

    } catch (error) {}

}


function hbDayKey(d) {

    const dt = d instanceof Date ? d : new Date(d);

    return dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2, "0") + "-" +
        String(dt.getDate()).padStart(2, "0");

}


function hbTodayKey() {

    return hbDayKey(new Date());

}


function hbFind(list, id) {

    for (let i = 0; i < list.length; i++) {

        if (list[i].id === id) return list[i];

    }

    return null;

}


function add(name) {

    name = String(name || "").trim();

    if (!name) return null;

    const list = hbLoad();

    const habit = {

        id: "h" + Date.now() + Math.floor(Math.random() * 999),

        name: name,

        days: {},

        createdAt: new Date().toISOString()

    };

    list.push(habit);

    try {

        console.log("habits: saving list with " + list.length + " habit(s)");

    } catch (e) {}

    hbSave(list);

    try {

        const verify = localStorage.getItem(HABITS_STORE_KEY);

        console.log("habits: save verified: " +
            (verify ? "PRESENT (" + verify.length + " chars)" : "MISSING!"));

    } catch (e) {

        console.log("habits: save verify FAILED: " + e.message);

    }

    refresh();

    try {

        Aegis.broadcast("habitAdded", { id: habit.id });

    } catch (error) {}

    return habit.id;

}


function toggleDay(id, key) {

    const list = hbLoad();

    const habit = hbFind(list, id);

    if (!habit) return false;

    if (!habit.days) habit.days = {};

    key = key || hbTodayKey();

    if (habit.days[key]) {

        delete habit.days[key];

    } else {

        habit.days[key] = true;

    }

    hbSave(list);

    refresh();

    try {

        Aegis.broadcast("habitToggled", { id: id, day: key });

    } catch (error) {}

    return true;

}


function toggle(id) {

    return toggleDay(id, hbTodayKey());

}


function rename(id, name) {

    name = String(name || "").trim();

    if (!name) return false;

    const list = hbLoad();

    const habit = hbFind(list, id);

    if (!habit) return false;

    habit.name = name;

    hbSave(list);

    refresh();

    try {

        Aegis.broadcast("habitRenamed", { id: id });

    } catch (error) {}

    return true;

}


function remove(id) {

    const list = hbLoad().filter((h) => h.id !== id);

    hbSave(list);

    refresh();

    try {

        Aegis.broadcast("habitRemoved", { id: id });

    } catch (error) {}

    return true;

}


function getStreak(habit) {

    if (!habit || !habit.days) return 0;

    let streak = 0;

    const d = new Date();

    /* A streak counts back from today, or from yesterday if
       today isn't checked yet. */

    if (!habit.days[hbDayKey(d)]) {

        d.setDate(d.getDate() - 1);

    }

    while (habit.days[hbDayKey(d)]) {

        streak += 1;

        d.setDate(d.getDate() - 1);

    }

    return streak;

}


function getStreaks() {

    const out = {};

    hbLoad().forEach((h) => {

        out[h.id] = getStreak(h);

    });

    return out;

}


function list() {

    return hbLoad();

}


function getWeekCheckins() {

    const habits = hbLoad();

    const start = new Date();

    start.setHours(0, 0, 0, 0);

    const dow = (start.getDay() + 6) % 7;

    start.setDate(start.getDate() - dow);

    const startKey = hbDayKey(start);

    let n = 0;

    habits.forEach((h) => {

        if (!h || !h.days) return;

        Object.keys(h.days).forEach((key) => {

            if (key >= startKey) n += 1;

        });

    });

    return n;

}


/* ---------- dashboard card ---------- */


function hbGrid() {

    try {

        return document.querySelector(".dashboard-grid");

    } catch (error) {

        return null;

    }

}


/* Scroll the card into view (the "open" action now that
   there is no separate page). */

function open() {

    refresh();

    try {

        if (hbCardEl && hbCardEl.scrollIntoView) {

            hbCardEl.scrollIntoView({ behavior: "smooth" });

        }

    } catch (error) {}

}


function hbStyle(el, styles) {

    try {

        Object.assign(el.style, styles);

    } catch (error) {}

}


function hbGhostBtn() {

    const b = document.createElement("button");

    hbStyle(b, {

        background: "transparent",

        border: "none",

        cursor: "pointer",

        padding: "2px",

        width: "auto",

        fontSize: "14px",

        color: "rgba(159, 220, 255, 0.55)"

    });

    return b;

}


function hbStat(label, value, accent) {

    const box = document.createElement("div");

    hbStyle(box, {

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

    hbStyle(v, {

        fontSize: "20px",

        fontWeight: "bold",

        color: accent || "#9fdcff"

    });

    const l = document.createElement("div");

    l.textContent = label;

    hbStyle(l, {

        fontSize: "10px",

        letterSpacing: "1px",

        color: "rgba(159, 220, 255, 0.6)",

        marginTop: "2px"

    });

    box.appendChild(v);

    box.appendChild(l);

    return box;

}


function hbDayDot(habit, date, isToday) {

    const key = hbDayKey(date);

    const done = !!(habit.days && habit.days[key]);

    const dot = document.createElement("button");

    dot.title = date.toLocaleDateString([], {

        weekday: "short",

        month: "short",

        day: "numeric"

    });

    hbStyle(dot, {

        width: "22px",

        height: "22px",

        borderRadius: "50%",

        border: "1px solid " + (isToday
            ? "rgba(80, 210, 255, 0.9)"
            : "rgba(80, 210, 255, 0.35)"),

        background: done
            ? "rgba(80, 210, 255, 0.55)"
            : "transparent",

        cursor: "pointer",

        padding: "0",

        flexShrink: "0"

    });

    dot.addEventListener("click", () => toggleDay(habit.id, key));

    return dot;

}


function hbStartRename(habit, nameEl) {

    const input = document.createElement("input");

    input.value = habit.name;

    hbStyle(input, {

        flex: "1",

        fontSize: "13px",

        background: "rgba(10, 20, 40, 0.9)",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        borderRadius: "8px",

        color: "#9fdcff",

        padding: "4px 8px"

    });

    const commit = () => {

        rename(habit.id, input.value);

    };

    input.addEventListener("keydown", (e) => {

        if (e.key === "Enter") commit();

        if (e.key === "Escape") refresh();

        e.stopPropagation();

    });

    input.addEventListener("blur", commit);

    nameEl.replaceWith(input);

    try {

        input.focus();

        input.select();

    } catch (error) {}

}


function refresh() {

    try {

        hbRefreshInner();

    } catch (error) {

        /* If anything goes wrong, say so IN the card instead
           of failing silently. */

        try {

            if (hbListEl) {

                hbListEl.innerHTML = "";

                const warn = document.createElement("div");

                warn.textContent = "⚠️ Habit error: " +
                    (error && error.message
                        ? error.message
                        : String(error));

                hbStyle(warn, {

                    fontSize: "12px",

                    color: "#ff9a8a",

                    padding: "8px 0"

                });

                hbListEl.appendChild(warn);

            }

        } catch (inner) {}

        try {

            console.error("habits refresh failed:", error);

        } catch (inner) {}

    }

}


function hbEscape(s) {

    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

}


function hbStatHTML(label, value, accent) {

    return '<div style="flex:1;min-width:80px;text-align:center;' +
        "padding:10px 6px;border-radius:12px;" +
        "background:rgba(80,210,255,0.07);" +
        'border:1px solid rgba(80,210,255,0.25)">' +
        '<div style="font-size:20px;font-weight:bold;color:' +
        (accent || "#9fdcff") + '">' + hbEscape(value) + "</div>" +
        '<div style="font-size:10px;letter-spacing:1px;' +
        'color:rgba(159,220,255,0.6);margin-top:2px">' +
        hbEscape(label) + "</div></div>";

}


/* One delegated click handler for the whole card (attached
   once in hbBuildCardEl). innerHTML rendering + delegation
   keeps every button working without per-node listeners. */

function hbOnCardClick(e) {

    let t = null;

    try {

        t = e.target && e.target.closest
            ? e.target.closest("[data-action]")
            : null;

    } catch (err) {}

    if (!t || !hbCardEl || !hbCardEl.contains(t)) return;

    const id = t.getAttribute("data-habit");

    if (!id) return;

    const action = t.getAttribute("data-action");

    if (action === "toggle") {

        toggle(id);

    } else if (action === "day") {

        toggleDay(id, t.getAttribute("data-day"));

    } else if (action === "rename") {

        hbStartRenameById(id);

    } else if (action === "delete") {

        try {

            if (confirm("Delete this habit?")) remove(id);

        } catch (err) {}

    }

}


function hbDayDotHTML(habit, date, isToday) {

    const key = hbDayKey(date);

    const done = !!(habit.days && habit.days[key]);

    let title = "";

    try {

        title = date.toLocaleDateString([], {
            weekday: "short", month: "short", day: "numeric"
        });

    } catch (err) {}

    return '<button data-action="day" data-habit="' + habit.id +
        '" data-day="' + key + '" title="' + hbEscape(title) +
        '" style="width:22px;height:22px;border-radius:50%;' +
        "border:1px solid " + (isToday
            ? "rgba(80,210,255,0.9)"
            : "rgba(80,210,255,0.35)") + ";" +
        "background:" + (done
            ? "rgba(80,210,255,0.55)"
            : "transparent") + ";" +
        'cursor:pointer;padding:0;flex-shrink:0"></button>';

}


function hbStartRenameById(id) {

    const habit = hbFind(hbLoad(), id);

    if (!habit || !hbListEl) return;

    let nameEl = null;

    try {

        nameEl = hbListEl.querySelector(
            '[data-habit="' + id + '"] [data-role="name"]');

    } catch (err) {}

    if (!nameEl) return;

    const input = document.createElement("input");

    input.value = habit.name;

    hbStyle(input, {

        flex: "1",

        fontSize: "13px",

        background: "rgba(10, 20, 40, 0.9)",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        borderRadius: "8px",

        color: "#9fdcff",

        padding: "4px 8px"

    });

    const commit = () => {

        rename(habit.id, input.value);

    };

    input.addEventListener("keydown", (ev) => {

        if (ev.key === "Enter") commit();

        if (ev.key === "Escape") refresh();

        ev.stopPropagation();

    });

    input.addEventListener("blur", commit);

    try {

        nameEl.replaceWith(input);

    } catch (err) {

        return;

    }

    try {

        input.focus();

        input.select();

    } catch (err) {}

}


function hbRefreshInner() {

    /* Re-query the live DOM: the cached element references can go
       stale if the dashboard rebuilds the card. The IDs are the
       source of truth. */

    const liveStats = document.getElementById("habitStats");

    const liveList = document.getElementById("habitList");

    if (liveStats && liveStats !== hbStatsEl) {

        try {

            console.log("habits: stats element reference was stale, adopting live element");

        } catch (e) {}

        hbStatsEl = liveStats;

    }

    if (liveList && liveList !== hbListEl) {

        try {

            console.log("habits: list element reference was stale, adopting live element");

        } catch (e) {}

        hbListEl = liveList;

    }

    if (!hbListEl || !hbStatsEl) return;

    const habits = hbLoad();

    const today = hbTodayKey();

    /* Stats header — built as an HTML string. (The
       createElement/appendChild chain proved unreliable in
       this host page; innerHTML works.) */

    const best = habits.reduce(
        (m, h) => Math.max(m, getStreak(h)), 0);

    /* Stats as one literal string (no helper calls) — the
       probe proved simple literal innerHTML works here. */

    let statsHTML = "";

    try {

        statsHTML =
        '<div style="display:flex;gap:8px;margin-bottom:14px">' +
        '<div style="flex:1;min-width:80px;text-align:center;padding:10px 6px;' +
        'border-radius:12px;background:rgba(80,210,255,0.07);' +
        'border:1px solid rgba(80,210,255,0.25)">' +
        '<div style="font-size:20px;font-weight:bold;color:#9fdcff">' +
        habits.length +
        '</div><div style="font-size:10px;letter-spacing:1px;' +
        'color:rgba(159,220,255,0.6);margin-top:2px">HABITS</div></div>' +
        '<div style="flex:1;min-width:80px;text-align:center;padding:10px 6px;' +
        'border-radius:12px;background:rgba(80,210,255,0.07);' +
        'border:1px solid rgba(80,210,255,0.25)">' +
        '<div style="font-size:20px;font-weight:bold;color:#9fdcff">' +
        getWeekCheckins() +
        '</div><div style="font-size:10px;letter-spacing:1px;' +
        'color:rgba(159,220,255,0.6);margin-top:2px">THIS WEEK</div></div>' +
        '<div style="flex:1;min-width:80px;text-align:center;padding:10px 6px;' +
        'border-radius:12px;background:rgba(80,210,255,0.07);' +
        'border:1px solid rgba(80,210,255,0.25)">' +
        '<div style="font-size:20px;font-weight:bold;color:#ffb35c">\u{1F525} ' +
        best +
        '</div><div style="font-size:10px;letter-spacing:1px;' +
        'color:rgba(159,220,255,0.6);margin-top:2px">BEST STREAK</div></div>' +
        "</div>";

    } catch (buildErr) {

        try {

            console.log("habits: stats HTML build FAILED: " + buildErr.message);

        } catch (e) {}

        statsHTML = "";

    }

    try {

        hbStatsEl.innerHTML = statsHTML;

        console.log("habits: stats set, kids=" + hbStatsEl.children.length +
            ", htmlLen=" + statsHTML.length);

    } catch (setErr) {

        try {

            console.log("habits: stats SET FAILED: " + setErr.message);

        } catch (e) {}

    }

    /* Habit rows — also HTML strings, wired via the
       delegated click handler on the card. */

    if (!habits.length) {

        hbListEl.innerHTML =
            '<div style="font-size:12px;' +
            'color:rgba(159,220,255,0.6);padding:8px 0">' +
            "No habits yet — add your first one above.</div>";

        return;

    }

    let html = "";

    habits.forEach((h) => {

        const done = !!(h.days && h.days[today]);

        const n = getStreak(h);

        html += '<div data-habit="' + h.id + '" style="' +
            "padding:10px 12px;border-radius:14px;" +
            "background:rgba(80,210,255,0.05);" +
            "border:1px solid rgba(80,210,255,0.2);" +
            'margin-bottom:10px">';

        html += '<div style="display:flex;align-items:center;' +
            'gap:10px;margin-bottom:8px">';

        html += '<button data-action="toggle" data-habit="' + h.id +
            '" style="font-size:22px;background:transparent;' +
            "border:none;cursor:pointer;padding:0;width:auto;" +
            "color:" + (done ? "#7dffb0" : "#9fdcff") + '">' +
            (done ? "\u2611" : "\u2610") + "</button>";

        html += '<span data-role="name" style="flex:1;font-size:14px;' +
            "font-weight:bold;color:" +
            (done ? "rgba(159,220,255,0.55)" : "#9fdcff") + ";" +
            "text-decoration:" + (done ? "line-through" : "none") +
            '">' + hbEscape(h.name) + "</span>";

        html += '<button data-action="rename" data-habit="' + h.id +
            '" title="Rename" style="background:transparent;' +
            "border:none;cursor:pointer;padding:2px;width:auto;" +
            'font-size:14px;color:rgba(159,220,255,0.55)">\u{1F4DD}</button>';

        html += '<span style="font-size:12px;color:#ffb35c">' +
            (n > 0 ? "\u{1F525} " + n : "") + "</span>";

        html += '<button data-action="delete" data-habit="' + h.id +
            '" title="Delete" style="background:transparent;' +
            "border:none;cursor:pointer;padding:2px;width:auto;" +
            'font-size:18px;color:rgba(255,120,120,0.7)">\u00D7</button>';

        html += "</div>";

        /* 7-day dots. */

        let labels = "";

        let dots = "";

        for (let i = 6; i >= 0; i--) {

            const d = new Date();

            d.setDate(d.getDate() - i);

            dots += hbDayDotHTML(h, d, i === 0);

            labels += '<span style="width:22px;text-align:center;' +
                'font-size:9px;color:rgba(159,220,255,0.45);' +
                'flex-shrink:0">' + "SMTWTFS"[d.getDay()] + "</span>";

        }

        html += '<div style="display:flex;gap:8px;margin-bottom:2px">' +
            labels + "</div>";

        html += '<div style="display:flex;gap:8px;align-items:center">' +
            dots + "</div>";

        html += "</div>";

    });

    hbListEl.innerHTML = html;

}


function hbBuildCardEl() {

    if (hbCardEl) return true;

    hbCardEl = document.createElement("div");

    hbCardEl.className = "dashboard-card full-card";

    hbCardEl.id = HABITS_CARD_ID;

    hbCardEl.setAttribute("data-widget", "habits");

    const h2 = document.createElement("h2");

    h2.textContent = "✅ Habit Tracker";

    hbStyle(h2, {

        fontSize: "16px",

        color: "#9fdcff",

        margin: "0 0 10px"

    });

    hbCardEl.appendChild(h2);

    hbStatsEl = document.createElement("div");

    hbStatsEl.id = "habitStats";

    hbCardEl.appendChild(hbStatsEl);

    const form = document.createElement("div");

    hbStyle(form, {

        display: "flex",

        gap: "8px",

        marginBottom: "14px"

    });

    hbInputEl = document.createElement("input");

    hbInputEl.placeholder = "New habit (e.g. Read 10 pages)";

    hbStyle(hbInputEl, { flex: "1" });

    const addBtn = document.createElement("button");

    addBtn.textContent = "ADD";

    hbStyle(addBtn, {

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: "rgba(80, 210, 255, 0.12)",

        color: "#9fdcff",

        padding: "8px 14px",

        fontSize: "12px",

        letterSpacing: "1px",

        cursor: "pointer",

        width: "auto"

    });

    const doAdd = () => {

        const val = hbInputEl ? hbInputEl.value : "(no input el)";

        try {

            console.log("habits: ADD clicked, input=" + JSON.stringify(val));

        } catch (e) {}

        const id = add(val);

        try {

            console.log("habits: add() returned " + JSON.stringify(id));

        } catch (e) {}

        if (id) hbInputEl.value = "";

        try {

            const stored = localStorage.getItem(HABITS_STORE_KEY);

            console.log("habits: storage after add: " +
                (stored ? stored.substring(0, 200) : "(empty/null)"));

        } catch (e) {

            console.log("habits: storage read FAILED: " + e.message);

        }

    };

    addBtn.addEventListener("click", doAdd);

    hbInputEl.addEventListener("keydown", (e) => {

        if (e.key === "Enter") doAdd();

    });

    form.appendChild(hbInputEl);

    form.appendChild(addBtn);

    hbCardEl.appendChild(form);

    hbListEl = document.createElement("div");

    hbListEl.id = "habitList";

    hbCardEl.appendChild(hbListEl);

    /* Delegated clicks for every habit row button (the rows
       themselves are rendered via innerHTML). */

    hbCardEl.addEventListener("click", hbOnCardClick);

    return true;

}


/* Put the card last in the grid and register it in the
   dashboard's layout, so a later renderLayout() keeps it
   at the bottom instead of stranding it at the top. */

function hbPlaceCard() {

    const grid = hbGrid();

    if (!grid || !hbCardEl) return false;

    try {

        const D = (typeof Dashboard !== "undefined")
            ? Dashboard
            : null;

        if (D && Array.isArray(D.layout)) {

            if (D.layout.indexOf(HABITS_CARD_ID) < 0) {

                D.layout.push(HABITS_CARD_ID);

                if (typeof D.saveLayout === "function") {

                    D.saveLayout();

                }

            }

        }

    } catch (error) {}

    grid.appendChild(hbCardEl);

    return true;

}


Aegis.register("habits", {

    version: "1.1.12",

    name: "Habit Tracker",


    add,

    toggle,

    toggleDay,

    rename,

    remove,

    getStreak,

    getStreaks,

    getWeekCheckins,

    list,

    open,

    refresh,


    init() {

        hbBuildCardEl();

        /* The dashboard grid may not exist yet when modules
           init — retry briefly until it does. Placing also
           registers the card in the dashboard layout, so a
           later renderLayout() keeps it at the bottom
           instead of stranding it at the top. */

        if (!hbPlaceCard()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (hbPlaceCard() || attempts >= 20) {

                    clearInterval(retry);

                    try {

                        console.log("habits diag: placed on retry", {

                            stats: hbStatsEl ? hbStatsEl.children.length : -1,

                            list: hbListEl ? hbListEl.children.length : -1

                        });

                    } catch (inner) {}

                }

            }, 250);

        }

        refresh();

        /* Temporary diagnostic: prove what refresh() actually
           painted, so a silent render failure can't hide. */

        try {

            console.log("habits diag: after refresh", {

                hasCard: !!hbCardEl,

                hasStats: !!hbStatsEl,

                hasList: !!hbListEl,

                statsKids: hbStatsEl ? hbStatsEl.children.length : -1,

                listKids: hbListEl ? hbListEl.children.length : -1,

                cardInDOM: hbCardEl ? document.contains(hbCardEl) : false,

                gridNow: !!hbGrid()

            });

        } catch (diagErr) {}

        console.log("Habit Tracker initialized.");

        /* One-line DOM sanity check: if appendChild works but
           innerHTML doesn't (or vice versa), this reveals it. */

        try {

            if (hbStatsEl && hbStatsEl.children.length === 0) {

                hbStatsEl.innerHTML =
                    '<div style="color:#ff9a8a;font-size:12px">' +
                    '⚠️ stats div is empty after render</div>';

            }

        } catch (diagErr2) {}

    },


    refresh() {

        refresh();

    },


    debugRender() {

        const habits = hbLoad();

        const best = habits.reduce(
            (m, h) => Math.max(m, getStreak(h)), 0);

        const html =
            '<div style="display:flex;gap:8px;margin-bottom:14px">' +
            '<div style="flex:1;min-width:80px;text-align:center;padding:10px 6px;' +
            'border-radius:12px;background:rgba(80,210,255,0.07);' +
            'border:1px solid rgba(80,210,255,0.25)">' +
            '<div style="font-size:20px;font-weight:bold;color:#9fdcff">' +
            habits.length +
            '</div><div style="font-size:10px;letter-spacing:1px;' +
            'color:rgba(159,220,255,0.6);margin-top:2px">HABITS</div></div>' +
            '<div style="flex:1;min-width:80px;text-align:center;padding:10px 6px;' +
            'border-radius:12px;background:rgba(80,210,255,0.07);' +
            'border:1px solid rgba(80,210,255,0.25)">' +
            '<div style="font-size:20px;font-weight:bold;color:#9fdcff">' +
            getWeekCheckins() +
            '</div><div style="font-size:10px;letter-spacing:1px;' +
            'color:rgba(159,220,255,0.6);margin-top:2px">THIS WEEK</div></div>' +
            '<div style="flex:1;min-width:80px;text-align:center;padding:10px 6px;' +
            'border-radius:12px;background:rgba(80,210,255,0.07);' +
            'border:1px solid rgba(80,210,255,0.25)">' +
            '<div style="font-size:20px;font-weight:bold;color:#ffb35c">\u{1F525} ' +
            best +
            '</div><div style="font-size:10px;letter-spacing:1px;' +
            'color:rgba(159,220,255,0.6);margin-top:2px">BEST STREAK</div></div>' +
            "</div>";

        const testDiv = document.createElement("div");

        let testKids = -1;

        let testError = null;

        try {

            testDiv.innerHTML = html;

            testKids = testDiv.children.length;

        } catch (e) {

            testError = e.message;

        }

        return {
            htmlLength: html.length,
            htmlHead: html.substring(0, 150),
            testKids: testKids,
            testError: testError,
            liveKids: hbStatsEl ? hbStatsEl.children.length : -1,
            habitsCount: habits.length,
            weekCheckins: getWeekCheckins(),
            best: best
        };

    },


    shutdown() {

        if (hbCardEl && hbCardEl.parentNode) {

            hbCardEl.parentNode.removeChild(hbCardEl);

        }

        hbCardEl = null;

        hbStatsEl = null;

        hbListEl = null;

        hbInputEl = null;

        console.log("Habit Tracker shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            habits: hbLoad().length

        };

    }

});
