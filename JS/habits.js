/*======================================

        AEGIS HABIT TRACKER v0.1.0

        STAND-IN module (unpolished). Add habits, check them
        off each day, watch streaks grow. Everything lives in
        localStorage ("aegisHabits").

        Page lives in the More hub, like Prayer Journal.

======================================*/


const HABITS_PAGE = "habits";

const HABITS_STORE_KEY = "aegisHabits";


let hbPageEl = null;

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


function toggle(id) {

    const list = hbLoad();

    const habit = list.find((h) => h.id === id);

    if (!habit) return false;

    if (!habit.days) habit.days = {};

    const key = hbTodayKey();

    if (habit.days[key]) {

        delete habit.days[key];

    } else {

        habit.days[key] = true;

    }

    hbSave(list);

    refresh();

    try {

        Aegis.broadcast("habitToggled", { id: id });

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


/* ---------- nav glue ---------- */


function hbNav() {

    try {

        if (typeof Aegis !== "undefined" &&
            Aegis.getModule) {

            const mod = Aegis.getModule("navigation");

            if (mod && mod.api) return mod.api;

        }

    } catch (error) {}

    return null;

}


function hbShowPage(name) {

    const nav = hbNav();

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


function hbGoMore() {

    hbShowPage("more");

}


function hbHookNavigation() {

    const nav = hbNav();

    if (!nav || !hbPageEl) return false;

    try {

        if (nav._els && Array.isArray(nav._els.pages)) {

            if (nav._els.pages.indexOf(hbPageEl) < 0) {

                nav._els.pages.push(hbPageEl);

            }

            return true;

        }

    } catch (error) {}

    return false;

}


function hbAddMoreEntry() {

    try {

        const hubList = document.querySelector(".aegis-more-list");

        if (!hubList) return false;

        if (hubList.querySelector(
            '[data-goto-page="' + HABITS_PAGE + '"]'
        )) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", HABITS_PAGE);

        item.textContent = "✅ Habit Tracker";

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


function hbStyle(el, styles) {

    try {

        Object.assign(el.style, styles);

    } catch (error) {}

}


/* ---------- page ---------- */


function open() {

    refresh();

    hbShowPage(HABITS_PAGE);

}


function refresh() {

    if (!hbListEl) return;

    hbListEl.innerHTML = "";

    const habits = hbLoad();

    const today = hbTodayKey();

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

        const row = document.createElement("div");

        hbStyle(row, {

            display: "flex",

            alignItems: "center",

            gap: "10px",

            padding: "8px 0",

            borderBottom: "1px solid rgba(80, 210, 255, 0.12)"

        });

        const box = document.createElement("button");

        const done = !!(h.days && h.days[today]);

        box.textContent = done ? "☑" : "☐";

        hbStyle(box, {

            fontSize: "20px",

            background: "transparent",

            border: "none",

            cursor: "pointer",

            padding: "0",

            width: "auto"

        });

        box.addEventListener("click", () => toggle(h.id));

        const name = document.createElement("span");

        name.textContent = h.name;

        hbStyle(name, {

            flex: "1",

            fontSize: "13px",

            color: done ? "rgba(159, 220, 255, 0.55)" : "#9fdcff",

            textDecoration: done ? "line-through" : "none"

        });

        const streak = document.createElement("span");

        const n = getStreak(h);

        streak.textContent = "🔥 " + n;

        hbStyle(streak, {

            fontSize: "12px",

            color: "#ffb35c"

        });

        const del = document.createElement("button");

        del.textContent = "×";

        hbStyle(del, {

            background: "transparent",

            border: "none",

            color: "rgba(255, 120, 120, 0.7)",

            fontSize: "16px",

            cursor: "pointer",

            width: "auto"

        });

        del.addEventListener("click", () => {

            if (confirm("Delete this habit?")) remove(h.id);

        });

        row.appendChild(box);

        row.appendChild(name);

        row.appendChild(streak);

        row.appendChild(del);

        hbListEl.appendChild(row);

    });

}


function hbBuildPage() {

    hbPageEl = document.createElement("div");

    hbPageEl.className = "aegis-page";

    hbPageEl.dataset.page = HABITS_PAGE;

    const back = document.createElement("button");

    back.className = "aegis-page-back";

    back.setAttribute("data-back-to", "more");

    back.textContent = "← Back to More";

    back.addEventListener("click", hbGoMore);

    hbPageEl.appendChild(back);

    const card = document.createElement("section");

    card.className = "card";

    const h2 = document.createElement("h2");

    h2.textContent = "✅ Habit Tracker";

    card.appendChild(h2);

    const form = document.createElement("div");

    hbStyle(form, {

        display: "flex",

        gap: "8px",

        marginBottom: "12px"

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

    card.appendChild(form);

    hbListEl = document.createElement("div");

    card.appendChild(hbListEl);

    hbPageEl.appendChild(card);

    document.body.appendChild(hbPageEl);

}


Aegis.register("habits", {

    version: "0.1.0",

    name: "Habit Tracker (stand-in)",


    add,

    toggle,

    remove,

    getStreak,

    getStreaks,

    list,

    open,

    refresh,


    init() {

        hbBuildPage();

        hbAddMoreEntry();

        refresh();

        if (!hbHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (hbHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        console.log("Habit Tracker (stand-in) initialized.");

    },


    refresh() {

        refresh();

    },


    shutdown() {

        if (hbPageEl && hbPageEl.parentNode) {

            hbPageEl.parentNode.removeChild(hbPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="' +
                HABITS_PAGE + '"]'
            );

            if (entry && entry.parentNode) {

                entry.parentNode.removeChild(entry);

            }

        } catch (error) {}

        hbPageEl = null;

        console.log("Habit Tracker (stand-in) shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            habits: hbLoad().length

        };

    }

});
