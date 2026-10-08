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

        return Array.isArray(list) ? list : [];

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

    hbSave(list);

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

        if (!h.days) return;

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


function hbRefreshInner() {

    if (!hbListEl || !hbStatsEl) return;

    const habits = hbLoad();

    const today = hbTodayKey();

    /* Stats header. */

    hbStatsEl.innerHTML = "";

    const row = document.createElement("div");

    hbStyle(row, {

        display: "flex",

        gap: "8px",

        marginBottom: "14px"

    });

    const best = habits.reduce(
        (m, h) => Math.max(m, getStreak(h)), 0);

    row.appendChild(hbStat("HABITS", habits.length));

    row.appendChild(hbStat("THIS WEEK", getWeekCheckins()));

    row.appendChild(hbStat("BEST STREAK", "🔥 " + best, "#ffb35c"));

    hbStatsEl.appendChild(row);

    /* Habit rows. */

    hbListEl.innerHTML = "";

    if (!habits.length) {

        const empty = document.createElement("div");

        empty.textContent =
            "No habits yet — add your first one above.";

        hbStyle(empty, {

            fontSize: "12px",

            color: "rgba(159, 220, 255, 0.6)",

            padding: "8px 0"

        });

        hbListEl.appendChild(empty);

        return;

    }

    habits.forEach((h) => {

        const done = !!(h.days && h.days[today]);

        const card = document.createElement("div");

        hbStyle(card, {

            padding: "10px 12px",

            borderRadius: "14px",

            background: "rgba(80, 210, 255, 0.05)",

            border: "1px solid rgba(80, 210, 255, 0.2)",

            marginBottom: "10px"

        });

        const top = document.createElement("div");

        hbStyle(top, {

            display: "flex",

            alignItems: "center",

            gap: "10px",

            marginBottom: "8px"

        });

        const box = document.createElement("button");

        box.textContent = done ? "☑" : "☐";

        hbStyle(box, {

            fontSize: "22px",

            background: "transparent",

            border: "none",

            cursor: "pointer",

            padding: "0",

            width: "auto",

            color: done ? "#7dffb0" : "#9fdcff"

        });

        box.addEventListener("click", () => toggle(h.id));

        const name = document.createElement("span");

        name.textContent = h.name;

        hbStyle(name, {

            flex: "1",

            fontSize: "14px",

            fontWeight: "bold",

            color: done ? "rgba(159, 220, 255, 0.55)" : "#9fdcff",

            textDecoration: done ? "line-through" : "none"

        });

        const edit = hbGhostBtn();

        edit.textContent = "✏️";

        edit.title = "Rename";

        edit.addEventListener("click", () => {

            hbStartRename(h, name);

        });

        const streak = document.createElement("span");

        const n = getStreak(h);

        streak.textContent = n > 0 ? "🔥 " + n : "";

        hbStyle(streak, {

            fontSize: "12px",

            color: "#ffb35c"

        });

        const del = hbGhostBtn();

        del.textContent = "×";

        del.title = "Delete";

        hbStyle(del, {

            color: "rgba(255, 120, 120, 0.7)",

            fontSize: "18px"

        });

        del.addEventListener("click", () => {

            if (confirm("Delete this habit?")) remove(h.id);

        });

        top.appendChild(box);

        top.appendChild(name);

        top.appendChild(edit);

        top.appendChild(streak);

        top.appendChild(del);

        card.appendChild(top);

        /* 7-day dots. */

        const labels = document.createElement("div");

        hbStyle(labels, {

            display: "flex",

            gap: "8px",

            marginBottom: "2px"

        });

        const dots = document.createElement("div");

        hbStyle(dots, {

            display: "flex",

            gap: "8px",

            alignItems: "center"

        });

        for (let i = 6; i >= 0; i--) {

            const d = new Date();

            d.setDate(d.getDate() - i);

            dots.appendChild(hbDayDot(h, d, i === 0));

            const lab = document.createElement("span");

            lab.textContent = "SMTWTFS"[d.getDay()];

            hbStyle(lab, {

                width: "22px",

                textAlign: "center",

                fontSize: "9px",

                color: "rgba(159, 220, 255, 0.45)",

                flexShrink: "0"

            });

            labels.appendChild(lab);

        }

        card.appendChild(labels);

        card.appendChild(dots);

        hbListEl.appendChild(card);

    });

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

        if (add(hbInputEl.value)) hbInputEl.value = "";

    };

    addBtn.addEventListener("click", doAdd);

    hbInputEl.addEventListener("keydown", (e) => {

        if (e.key === "Enter") doAdd();

    });

    form.appendChild(hbInputEl);

    form.appendChild(addBtn);

    hbCardEl.appendChild(form);

    hbListEl = document.createElement("div");

    hbCardEl.appendChild(hbListEl);

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

    version: "1.1.2",

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

                }

            }, 250);

        }

        refresh();

        console.log("Habit Tracker initialized.");

    },


    refresh() {

        refresh();

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
