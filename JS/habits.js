/* Habit Tracker v2.2.0 — clean rebuild.
   Full-width dashboard card under Dashboard on the Home page.
   Stats header, 7-day dots, inline rename. localStorage only.
   Render pattern follows prayer.js: createElement + appendChild,
   innerHTML used only to clear containers. */

(function () {

"use strict";

const STORE_KEY = "aegisHabits";
const CARD_ID = "card-habits";
const STATS_ID = "habitStats";
const LIST_ID = "habitList";
const INPUT_ID = "habitInput";

/* Selected frequency for the add form ("daily" | "weekly" | "monthly"). */
let hbSelectedFreq = "daily";

/* ---------- storage ---------- */

function load() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        return list.filter((h) => h && typeof h === "object" && typeof h.id === "string");
    } catch (e) {
        return [];
    }
}

function save(list) {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) {}
}

function dayKey(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2, "0") + "-" +
        String(dt.getDate()).padStart(2, "0");
}

function todayKey() {
    return dayKey(new Date());
}

function freqOf(h) {
    const f = h && h.frequency;
    return (f === "weekly" || f === "monthly") ? f : "daily";
}

function weekStart(d) {
    const dt = d instanceof Date ? d : new Date(d);
    const dow = (dt.getDay() + 6) % 7;
    const m = new Date(dt);
    m.setHours(0, 0, 0, 0);
    m.setDate(dt.getDate() - dow);
    return m;
}

function monthStart(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), 1);
}

function monthKey(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
}

/* Period key for toggling: daily = exact day, weekly = Monday, monthly = 1st. */
function periodToggleKey(date, freq) {
    if (freq === "weekly") return dayKey(weekStart(date));
    if (freq === "monthly") return dayKey(monthStart(date));
    return dayKey(date);
}

/* Was the habit done at any point in the period starting at `start`? */
function doneInPeriod(h, start, freq) {
    if (!h || !h.days) return false;
    if (freq === "daily") return !!h.days[dayKey(start)];
    if (freq === "weekly") {
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            if (h.days[dayKey(d)]) return true;
        }
        return false;
    }
    /* monthly */
    const mk = monthKey(start);
    return Object.keys(h.days).some((k) => k.substring(0, 7) === mk);
}

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/* ---------- streaks ---------- */

function getStreak(h) {
    if (!h || !h.days) return 0;
    const freq = freqOf(h);
    if (freq === "daily") {
        let n = 0;
        const d = new Date();
        if (!h.days[dayKey(d)]) d.setDate(d.getDate() - 1);
        while (h.days[dayKey(d)]) {
            n += 1;
            d.setDate(d.getDate() - 1);
        }
        return n;
    }
    if (freq === "weekly") {
        let n = 0;
        let ws = weekStart(new Date());
        if (!doneInPeriod(h, ws, "weekly")) ws.setDate(ws.getDate() - 7);
        while (doneInPeriod(h, ws, "weekly")) {
            n += 1;
            ws.setDate(ws.getDate() - 7);
        }
        return n;
    }
    /* monthly */
    let n = 0;
    let ms = monthStart(new Date());
    if (!doneInPeriod(h, ms, "monthly")) ms.setMonth(ms.getMonth() - 1);
    while (doneInPeriod(h, ms, "monthly")) {
        n += 1;
        ms.setMonth(ms.getMonth() - 1);
    }
    return n;
}

function getWeekCheckins(habits) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const startKey = dayKey(start);
    let n = 0;
    habits.forEach((h) => {
        if (!h || !h.days) return;
        Object.keys(h.days).forEach((k) => {
            if (k >= startKey) n += 1;
        });
    });
    return n;
}

/* ---------- element refs (re-queried, never trusted blindly) ---------- */

function cardEl() { return document.getElementById(CARD_ID); }
function statsEl() { return document.getElementById(STATS_ID); }
function listEl() { return document.getElementById(LIST_ID); }
function inputEl() { return document.getElementById(INPUT_ID); }

function style(el, obj) {
    if (!el || !el.style) return;
    Object.keys(obj).forEach((k) => {
        try { el.style[k] = obj[k]; } catch (e) {}
    });
}

/* ---------- card construction (once) ---------- */

function buildCard() {
    if (document.getElementById(CARD_ID)) return;

    const card = document.createElement("div");
    card.id = CARD_ID;
    card.className = "dashboard-card full-card";
    card.setAttribute("data-widget", "habits");

    const h2 = document.createElement("h2");
    h2.textContent = "✅ Habit Tracker";
    style(h2, { fontSize: "16px", color: "#9fdcff", margin: "0 0 10px" });
    card.appendChild(h2);

    const stats = document.createElement("div");
    stats.id = STATS_ID;
    card.appendChild(stats);

    const form = document.createElement("div");
    style(form, { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" });

    /* Row 1: big full-width name input. */
    const input = document.createElement("input");
    input.id = INPUT_ID;
    input.placeholder = "New habit (e.g. Read 10 pages)";
    style(input, {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 14px",
        fontSize: "14px",
        background: "rgba(80,210,255,0.06)",
        border: "1px solid rgba(80,210,255,0.25)",
        borderRadius: "12px",
        color: "#dff2ff",
        outline: "none"
    });
    form.appendChild(input);

    /* Row 2: frequency toggle buttons (nav-bar pill style) + ADD. */
    const freqRow = document.createElement("div");
    style(freqRow, { display: "flex", gap: "8px", alignItems: "stretch" });
    form.appendChild(freqRow);

    const freqBtns = {};
    ["daily", "weekly", "monthly"].forEach((freq) => {
        const b = document.createElement("button");
        b.textContent = freq.charAt(0).toUpperCase() + freq.slice(1);
        b.setAttribute("data-freq", freq);
        b.type = "button";
        style(b, {
            flex: "1",
            borderRadius: "999px",
            border: "1px solid rgba(80,210,255,0.4)",
            padding: "9px 4px",
            fontSize: "12px",
            letterSpacing: "1px",
            cursor: "pointer",
            width: "auto",
            transition: "background 0.15s, color 0.15s"
        });
        b.addEventListener("click", () => {
            hbSelectedFreq = freq;
            paintFreqBtns();
        });
        freqRow.appendChild(b);
        freqBtns[freq] = b;
    });

    function paintFreqBtns() {
        ["daily", "weekly", "monthly"].forEach((freq) => {
            const b = freqBtns[freq];
            const active = freq === hbSelectedFreq;
            style(b, {
                background: active ? "#50d2ff" : "rgba(80,210,255,0.08)",
                color: active ? "#06121f" : "#9fdcff",
                fontWeight: active ? "bold" : "normal",
                border: active
                    ? "1px solid #50d2ff"
                    : "1px solid rgba(80,210,255,0.4)"
            });
        });
    }
    paintFreqBtns();

    const btn = document.createElement("button");
    btn.textContent = "ADD";
    style(btn, {
        borderRadius: "999px",
        border: "1px solid rgba(80, 210, 255, 0.5)",
        background: "rgba(80, 210, 255, 0.12)",
        color: "#9fdcff",
        padding: "9px 18px",
        fontSize: "12px",
        letterSpacing: "1px",
        cursor: "pointer",
        width: "auto",
        fontWeight: "bold"
    });
    btn.addEventListener("click", doAdd);
    freqRow.appendChild(btn);

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") doAdd();
    });

    card.appendChild(form);

    const list = document.createElement("div");
    list.id = LIST_ID;
    card.appendChild(list);

    card.addEventListener("click", onCardClick);

    // Place under the dashboard grid.
    const grid = document.querySelector(".dashboard-grid");
    if (grid) {
        grid.appendChild(card);
    } else {
        // Retry briefly if the grid isn't ready yet.
        let n = 0;
        const t = setInterval(() => {
            n += 1;
            const g = document.querySelector(".dashboard-grid");
            if (g) {
                g.appendChild(card);
                clearInterval(t);
                render();
            } else if (n >= 20) {
                clearInterval(t);
            }
        }, 250);
    }

    try {
        const D = (typeof Dashboard !== "undefined") ? Dashboard : null;
        if (D && Array.isArray(D.layout) && D.layout.indexOf(CARD_ID) < 0) {
            D.layout.push(CARD_ID);
            if (typeof D.saveLayout === "function") D.saveLayout();
        }
    } catch (e) {}
}

function doAdd() {
    const input = inputEl();
    const val = input ? input.value : "";
    if (addHabit(val) && input) input.value = "";
}

/* ---------- rendering (createElement, like prayer.js) ---------- */

function statBox(label, value, accent) {
    const box = document.createElement("div");
    style(box, {
        flex: "1",
        minWidth: "80px",
        textAlign: "center",
        padding: "10px 6px",
        borderRadius: "12px",
        background: "rgba(80,210,255,0.07)",
        border: "1px solid rgba(80,210,255,0.25)"
    });
    const v = document.createElement("div");
    v.textContent = value;
    style(v, { fontSize: "20px", fontWeight: "bold", color: accent });
    const l = document.createElement("div");
    l.textContent = label;
    style(l, {
        fontSize: "10px",
        letterSpacing: "1px",
        color: "rgba(159,220,255,0.6)",
        marginTop: "2px"
    });
    box.appendChild(v);
    box.appendChild(l);
    return box;
}

function renderStats(habits) {
    const el = statsEl();
    if (!el) return;
    el.innerHTML = "";

    const wrap = document.createElement("div");
    style(wrap, { display: "flex", gap: "8px", marginBottom: "14px" });

    const best = habits.reduce((m, h) => Math.max(m, getStreak(h)), 0);

    wrap.appendChild(statBox("HABITS", String(habits.length), "#9fdcff"));
    wrap.appendChild(statBox("THIS WEEK", String(getWeekCheckins(habits)), "#9fdcff"));
    wrap.appendChild(statBox("BEST STREAK", "🔥 " + best, "#ffb35c"));

    el.appendChild(wrap);
}

function freqLabel(freq) {
    return freq === "weekly" ? "weekly" : freq === "monthly" ? "monthly" : "daily";
}

function periodDots(habit) {
    const row = document.createElement("div");
    style(row, { display: "flex", gap: "4px" });

    const freq = freqOf(habit);
    const now = new Date();

    for (let i = 0; i < 7; i++) {
        let start, toggleK, label, isCurrent;
        if (freq === "weekly") {
            start = weekStart(now);
            start.setDate(start.getDate() - (6 - i) * 7);
            toggleK = dayKey(start);
            label = "Week of " + toggleK;
            isCurrent = i === 6;
        } else if (freq === "monthly") {
            start = monthStart(now);
            start.setMonth(start.getMonth() - (6 - i));
            toggleK = dayKey(start);
            label = start.toLocaleString("default", { month: "short", year: "numeric" });
            isCurrent = i === 6;
        } else {
            const monday = weekStart(now);
            start = new Date(monday);
            start.setDate(monday.getDate() + i);
            toggleK = dayKey(start);
            label = toggleK;
            isCurrent = toggleK === todayKey();
        }

        const done = doneInPeriod(habit, start, freq);

        const dot = document.createElement("button");
        dot.setAttribute("data-habit", habit.id);
        dot.setAttribute("data-day", toggleK);
        dot.setAttribute("data-act", "dot");
        dot.title = label + (done ? " (done)" : "");
        style(dot, {
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            border: "1px solid rgba(80,210,255,0.4)",
            background: done ? "#50d2ff" : "transparent",
            cursor: "pointer",
            padding: "0",
            outline: isCurrent ? "2px solid rgba(80,210,255,0.6)" : "none",
            outlineOffset: "1px"
        });
        row.appendChild(dot);
    }
    return row;
}

function habitRow(habit) {
    const row = document.createElement("div");
    style(row, {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 4px",
        borderBottom: "1px solid rgba(80,210,255,0.12)"
    });

    const name = document.createElement("span");
    name.textContent = habit.name;
    name.setAttribute("data-habit", habit.id);
    name.setAttribute("data-act", "rename");
    name.title = "Tap to rename";
    style(name, {
        flex: "1",
        fontSize: "14px",
        color: "#dff2ff",
        cursor: "pointer"
    });
    row.appendChild(name);

    const freq = freqOf(habit);
    if (freq !== "daily") {
        const badge = document.createElement("span");
        badge.textContent = freqLabel(freq);
        style(badge, {
            fontSize: "9px",
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "rgba(159,220,255,0.55)",
            border: "1px solid rgba(80,210,255,0.3)",
            borderRadius: "999px",
            padding: "2px 7px",
            whiteSpace: "nowrap"
        });
        row.appendChild(badge);
    }

    row.appendChild(periodDots(habit));

    const streak = document.createElement("span");
    streak.textContent = "🔥 " + getStreak(habit);
    style(streak, { fontSize: "12px", color: "rgba(159,220,255,0.5)" });
    row.appendChild(streak);

    const mkBtn = (label, act, color) => {
        const b = document.createElement("button");
        b.textContent = label;
        b.setAttribute("data-habit", habit.id);
        b.setAttribute("data-act", act);
        style(b, {
            background: "none",
            border: "none",
            fontSize: "14px",
            cursor: "pointer",
            color: color || "#9fdcff",
            padding: "2px 4px"
        });
        return b;
    };

    row.appendChild(mkBtn("✓", "check", "#9fdcff"));
    row.appendChild(mkBtn("✏️", "rename", "rgba(159,220,255,0.5)"));
    row.appendChild(mkBtn("🗑️", "del", "rgba(255,154,138,0.7)"));

    return row;
}

function renderList(habits) {
    const el = listEl();
    if (!el) return;
    el.innerHTML = "";

    if (!habits.length) {
        const p = document.createElement("p");
        p.className = "empty-state";
        p.textContent = "No habits yet — add your first one above.";
        style(p, {
            fontSize: "12px",
            color: "rgba(159,220,255,0.6)",
            padding: "8px 0"
        });
        el.appendChild(p);
        return;
    }

    habits.forEach((h) => el.appendChild(habitRow(h)));
}

function render() {
    const habits = load();
    renderStats(habits);
    renderList(habits);
}

/* ---------- actions ---------- */

function selectedFreq() {
    return (hbSelectedFreq === "weekly" || hbSelectedFreq === "monthly")
        ? hbSelectedFreq
        : "daily";
}

function addHabit(name) {
    const clean = String(name == null ? "" : name).trim();
    if (!clean) return null;
    const habits = load();
    const habit = {
        id: "h" + Date.now() + Math.floor(Math.random() * 1000),
        name: clean,
        frequency: selectedFreq(),
        days: {},
        createdAt: new Date().toISOString()
    };
    habits.push(habit);
    save(habits);
    render();
    try {
        if (typeof Aegis !== "undefined" && Aegis.broadcast) {
            Aegis.broadcast("habitAdded", { id: habit.id, name: habit.name });
        }
    } catch (e) {}
    return habit.id;
}

function toggleDay(id, key) {
    const habits = load();
    const h = habits.find((x) => x.id === id);
    if (!h) return;
    if (!h.days) h.days = {};
    if (h.days[key]) delete h.days[key];
    else h.days[key] = true;
    save(habits);
    render();
}

function checkToday(id) {
    const habits = load();
    const h = habits.find((x) => x.id === id);
    const freq = freqOf(h);
    toggleDay(id, periodToggleKey(new Date(), freq));
}

function removeHabit(id) {
    const el = listEl();
    const btn = el ? el.querySelector('[data-habit="' + id + '"][data-act="del"]') : null;
    if (btn && !btn.hasAttribute("data-confirm")) {
        btn.setAttribute("data-confirm", "1");
        btn.textContent = "Sure?";
        setTimeout(() => {
            try { btn.removeAttribute("data-confirm"); btn.textContent = "🗑️"; } catch (e) {}
        }, 2500);
        return;
    }
    save(load().filter((h) => h.id !== id));
    render();
}

function renameHabit(id) {
    const habits = load();
    const h = habits.find((x) => x.id === id);
    if (!h) return;
    const next = typeof prompt === "function"
        ? prompt("Rename habit:", h.name)
        : null;
    if (next == null) return;
    const clean = String(next).trim();
    if (!clean) return;
    h.name = clean;
    save(habits);
    render();
}

function onCardClick(e) {
    const t = e.target && e.target.closest
        ? e.target.closest("[data-act]")
        : null;
    if (!t) return;
    const act = t.getAttribute("data-act");
    const id = t.getAttribute("data-habit");
    if (!id) return;
    if (act === "dot") toggleDay(id, t.getAttribute("data-day"));
    else if (act === "check") checkToday(id);
    else if (act === "del") removeHabit(id);
    else if (act === "rename") renameHabit(id);
}

/* ---------- module registration ---------- */

if (typeof Aegis !== "undefined" && Aegis.register) {
    Aegis.register("habits", {
        version: "2.2.0",
        name: "Habit Tracker",

        init() {
            buildCard();
            render();
            try { console.log("Habit Tracker v2.2.0 initialized."); } catch (e) {}
        },

        refresh() { render(); },

        add: addHabit,

        toggle: toggleDay,

        check: checkToday,

        remove: removeHabit,

        rename: renameHabit,

        list() { return load(); },

        getStreak(h) { return getStreak(h); },

        status() {
            const habits = load();
            return {
                online: !!cardEl(),
                version: "2.2.0",
                count: habits.length,
                weekCheckins: getWeekCheckins(habits)
            };
        }
    });
}

})();
