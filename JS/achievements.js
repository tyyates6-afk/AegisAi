/*======================================

        AEGIS ACHIEVEMENTS v0.1.0

        STAND-IN module (unpolished). Watches what Ty does
        across the other modules (focus sessions, prayers,
        habits) and unlocks achievements. Unlocked ids live
        in localStorage ("aegisAchievements").

        Checks run at boot and whenever a relevant broadcast
        fires (focusEnded, prayerAdded, prayerAnswered,
        habitAdded, habitToggled).

        Page lives in the More hub, like Prayer Journal.

======================================*/


const ACH_PAGE = "achievements";

const ACH_STORE_KEY = "aegisAchievements";


let achPageEl = null;

let achListEl = null;


/* ---------- data ---------- */


function achRead(key) {

    try {

        const raw = localStorage.getItem(key);

        if (!raw) return [];

        const list = JSON.parse(raw);

        return Array.isArray(list) ? list : [];

    } catch (error) {

        return [];

    }

}


function achUnlocked() {

    try {

        const raw = localStorage.getItem(ACH_STORE_KEY);

        if (!raw) return [];

        const list = JSON.parse(raw);

        return Array.isArray(list) ? list : [];

    } catch (error) {

        return [];

    }

}


function achSaveUnlocked(ids) {

    try {

        localStorage.setItem(
            ACH_STORE_KEY,
            JSON.stringify(ids)
        );

    } catch (error) {}

}


function achDayKey(d) {

    const dt = d instanceof Date ? d : new Date(d);

    return dt.getFullYear() + "-" +
        String(dt.getMonth() + 1).padStart(2, "0") + "-" +
        String(dt.getDate()).padStart(2, "0");

}


function achStreak(habit) {

    if (!habit || !habit.days) return 0;

    let streak = 0;

    const d = new Date();

    if (!habit.days[achDayKey(d)]) {

        d.setDate(d.getDate() - 1);

    }

    while (habit.days[achDayKey(d)]) {

        streak += 1;

        d.setDate(d.getDate() - 1);

    }

    return streak;

}


function achStats() {

    const sessions = achRead("aegisFocusSessions");

    const prayers = achRead("aegisPrayerJournal");

    const habits = achRead("aegisHabits");

    return {

        focusDone: sessions.filter((s) => s && s.completed).length,

        focusMinutes: sessions.reduce(
            (t, s) => t + ((s && s.minutes) || 0), 0),

        prayers: prayers.length,

        answered: prayers.filter(
            (p) => p && p.status === "answered").length,

        habits: habits.length,

        bestStreak: habits.reduce(
            (m, h) => Math.max(m, achStreak(h)), 0)

    };

}


/* id, name, hint, icon, test(stats) */

const ACH_DEFS = [

    {

        id: "first-focus",

        name: "Locked In",

        hint: "Finish one focus session",

        icon: "🎯",

        test: (s) => s.focusDone >= 1

    },

    {

        id: "focus-10",

        name: "Deep Worker",

        hint: "Finish 10 focus sessions",

        icon: "🧠",

        test: (s) => s.focusDone >= 10

    },

    {

        id: "focus-hour",

        name: "Hour of Power",

        hint: "Log 60 total focus minutes",

        icon: "⏳",

        test: (s) => s.focusMinutes >= 60

    },

    {

        id: "prayer-1",

        name: "First Ask",

        hint: "Add your first prayer",

        icon: "🙏",

        test: (s) => s.prayers >= 1

    },

    {

        id: "prayer-10",

        name: "Prayer Warrior",

        hint: "Add 10 prayers",

        icon: "⚔️",

        test: (s) => s.prayers >= 10

    },

    {

        id: "answered-1",

        name: "Answered",

        hint: "Mark one prayer answered",

        icon: "✨",

        test: (s) => s.answered >= 1

    },

    {

        id: "habit-1",

        name: "New Routine",

        hint: "Create your first habit",

        icon: "🌱",

        test: (s) => s.habits >= 1

    },

    {

        id: "streak-7",

        name: "Unstoppable",

        hint: "Reach a 7-day habit streak",

        icon: "🔥",

        test: (s) => s.bestStreak >= 7

    }

];


function check() {

    const stats = achStats();

    const unlocked = achUnlocked();

    const fresh = [];

    ACH_DEFS.forEach((def) => {

        if (unlocked.indexOf(def.id) >= 0) return;

        let ok = false;

        try {

            ok = !!def.test(stats);

        } catch (error) {}

        if (ok) {

            unlocked.push(def.id);

            fresh.push(def);

        }

    });

    if (fresh.length) {

        achSaveUnlocked(unlocked);

        fresh.forEach((def) => {

            try {

                Aegis.broadcast("achievementUnlocked", {

                    id: def.id,

                    name: def.name

                });

            } catch (error) {}

            try {

                Aegis.run("toast", "show",
                    def.icon + " Achievement: " + def.name);

            } catch (error) {}

            console.log("🏆 Achievement unlocked: " + def.name);

        });

        refresh();

    }

    return fresh.map((d) => d.id);

}


function list() {

    const unlocked = achUnlocked();

    return ACH_DEFS.map((def) => ({

        id: def.id,

        name: def.name,

        hint: def.hint,

        icon: def.icon,

        unlocked: unlocked.indexOf(def.id) >= 0

    }));

}


/* ---------- nav glue ---------- */


function achNav() {

    try {

        if (typeof Aegis !== "undefined" &&
            Aegis.getModule) {

            const mod = Aegis.getModule("navigation");

            if (mod && mod.api) return mod.api;

        }

    } catch (error) {}

    return null;

}


function achShowPage(name) {

    const nav = achNav();

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


function achGoMore() {

    achShowPage("more");

}


function achHookNavigation() {

    const nav = achNav();

    if (!nav || !achPageEl) return false;

    try {

        if (nav._els && Array.isArray(nav._els.pages)) {

            if (nav._els.pages.indexOf(achPageEl) < 0) {

                nav._els.pages.push(achPageEl);

            }

            return true;

        }

    } catch (error) {}

    return false;

}


function achAddMoreEntry() {

    try {

        const hubList = document.querySelector(".aegis-more-list");

        if (!hubList) return false;

        if (hubList.querySelector(
            '[data-goto-page="' + ACH_PAGE + '"]'
        )) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", ACH_PAGE);

        item.textContent = "🏆 Achievements";

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


function achStyle(el, styles) {

    try {

        Object.assign(el.style, styles);

    } catch (error) {}

}


/* ---------- page ---------- */


function open() {

    refresh();

    achShowPage(ACH_PAGE);

}


function refresh() {

    if (!achListEl) return;

    achListEl.innerHTML = "";

    const items = list();

    const unlocked = items.filter((i) => i.unlocked);

    const locked = items.filter((i) => !i.unlocked);

    const head = document.createElement("div");

    head.textContent = unlocked.length + " / " + items.length +
        " unlocked";

    achStyle(head, {

        fontSize: "12px",

        color: "rgba(159, 220, 255, 0.65)",

        marginBottom: "10px"

    });

    achListEl.appendChild(head);

    items.forEach((item) => {

        const row = document.createElement("div");

        achStyle(row, {

            display: "flex",

            alignItems: "center",

            gap: "10px",

            padding: "8px 0",

            borderBottom: "1px solid rgba(80, 210, 255, 0.12)",

            opacity: item.unlocked ? "1" : "0.55"

        });

        const icon = document.createElement("span");

        icon.textContent = item.unlocked ? item.icon : "🔒";

        achStyle(icon, { fontSize: "20px" });

        const mid = document.createElement("div");

        achStyle(mid, { flex: "1" });

        const name = document.createElement("div");

        name.textContent = item.name;

        achStyle(name, {

            fontSize: "13px",

            color: "#9fdcff"

        });

        const hint = document.createElement("div");

        hint.textContent = item.hint;

        achStyle(hint, {

            fontSize: "11px",

            color: "rgba(159, 220, 255, 0.55)"

        });

        mid.appendChild(name);

        mid.appendChild(hint);

        row.appendChild(icon);

        row.appendChild(mid);

        achListEl.appendChild(row);

    });

}


function achBuildPage() {

    achPageEl = document.createElement("div");

    achPageEl.className = "aegis-page";

    achPageEl.dataset.page = ACH_PAGE;

    const back = document.createElement("button");

    back.className = "aegis-page-back";

    back.setAttribute("data-back-to", "more");

    back.textContent = "← Back to More";

    back.addEventListener("click", achGoMore);

    achPageEl.appendChild(back);

    const card = document.createElement("section");

    card.className = "card";

    const h2 = document.createElement("h2");

    h2.textContent = "🏆 Achievements";

    card.appendChild(h2);

    achListEl = document.createElement("div");

    card.appendChild(achListEl);

    achPageEl.appendChild(card);

    document.body.appendChild(achPageEl);

}


const achUnsubs = [];


Aegis.register("achievements", {

    version: "0.1.0",

    name: "Achievements (stand-in)",


    check,

    list,

    open,

    refresh,


    init() {

        achBuildPage();

        achAddMoreEntry();

        refresh();

        if (!achHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (achHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        ["focusEnded", "prayerAdded", "prayerAnswered",
            "habitAdded", "habitToggled"].forEach((evt) => {

            try {

                achUnsubs.push(Aegis.listen(evt, check));

            } catch (error) {}

        });

        check();

        console.log("Achievements (stand-in) initialized.");

    },


    refresh() {

        refresh();

    },


    shutdown() {

        achUnsubs.forEach((unsub) => {

            try {

                unsub();

            } catch (error) {}

        });

        achUnsubs.length = 0;

        if (achPageEl && achPageEl.parentNode) {

            achPageEl.parentNode.removeChild(achPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="' +
                ACH_PAGE + '"]'
            );

            if (entry && entry.parentNode) {

                entry.parentNode.removeChild(entry);

            }

        } catch (error) {}

        achPageEl = null;

        console.log("Achievements (stand-in) shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            unlocked: achUnlocked().length,

            total: ACH_DEFS.length

        };

    }

});
