/*======================================
        AEGIS FOCUS PROTOCOL v1.0.0
======================================

    One-tap focus mode for AEGIS.

    SETUP:
    1. Save this file as JS/focus.js
    2. Add <script src="JS/focus.js"></script> after core.js

    USE:
    - Tap the FOCUS button (bottom-left) to open setup.
    - Or: Aegis.run("focus", "start", 25, "Bible study")
    - Aegis.run("focus", "stop")
    - Aegis.run("focus", "getWeekMinutes")

    INTEGRATION:
    - Broadcasts "focusStarted" / "focusEnded".
    - Tells the pet to sleep during focus and celebrate
      after (works on both pets when linked).
    - Sessions are stored locally, no AI, no backend.

======================================*/


const FOCUS_STORE_KEY = "aegisFocusSessions";

const FOCUS_PRESETS = [15, 25, 50];


let focusActive = false;

let focusPaused = false;

let focusLabel = "";

let focusTotalSec = 0;

let focusRemainingSec = 0;

let focusTimer = null;

let focusStartedAt = null;

let focusBtn = null;

let focusOverlay = null;

let focusTimeEl = null;

let focusLabelEl = null;

let focusPauseBtn = null;


function focusLoadSessions() {

    try {

        const raw = localStorage.getItem(FOCUS_STORE_KEY);

        if (!raw) return [];

        const list = JSON.parse(raw);

        return Array.isArray(list) ? list : [];

    } catch (error) {

        return [];

    }

}


function focusSaveSession(entry) {

    try {

        const list = focusLoadSessions();

        list.push(entry);

        localStorage.setItem(
            FOCUS_STORE_KEY,
            JSON.stringify(list)
        );

    } catch (error) {}

}


function focusFmt(sec) {

    const m = Math.floor(sec / 60);

    const s = sec % 60;

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

}


function focusRender() {

    if (focusTimeEl) {

        focusTimeEl.textContent = focusFmt(focusRemainingSec);

    }

    document.title = focusActive
        ? `⏱ ${focusFmt(focusRemainingSec)} — AEGIS`
        : "AEGIS";

}


function focusTick() {

    if (focusPaused) return;

    focusRemainingSec -= 1;

    focusRender();

    if (focusRemainingSec <= 0) {

        focusFinish(true);

    }

}


function focusShowOverlay() {

    focusOverlay.style.display = "flex";

    focusBtn.style.display = "none";

}


function focusHideOverlay() {

    focusOverlay.style.display = "none";

    focusBtn.style.display = "flex";

    document.title = "AEGIS";

}


function start(minutes = 25, label = "") {

    if (focusActive) return;

    minutes = Math.max(1, Math.round(minutes) || 25);

    focusActive = true;

    focusPaused = false;

    focusLabel = String(label || "").slice(0, 60);

    focusTotalSec = minutes * 60;

    focusRemainingSec = focusTotalSec;

    focusStartedAt = new Date().toISOString();

    focusLabelEl.textContent = focusLabel || "Focus session";

    focusPauseBtn.textContent = "Pause";

    focusShowOverlay();

    focusRender();

    clearInterval(focusTimer);

    focusTimer = setInterval(focusTick, 1000);

    Aegis.broadcast("focusStarted", {

        minutes: minutes,

        label: focusLabel

    });

    Aegis.broadcast("petMood", { mood: "sleep" });

    console.log(`Focus started: ${minutes} min.`);

}


function pause() {

    if (!focusActive || focusPaused) return;

    focusPaused = true;

    focusPauseBtn.textContent = "Resume";

    focusRender();

}


function resume() {

    if (!focusActive || !focusPaused) return;

    focusPaused = false;

    focusPauseBtn.textContent = "Pause";

    focusRender();

}


function focusFinish(completed) {

    if (!focusActive) return;

    clearInterval(focusTimer);

    focusTimer = null;

    const elapsedSec = focusTotalSec - focusRemainingSec;

    focusSaveSession({

        startedAt: focusStartedAt,

        minutes: Math.round(elapsedSec / 60),

        label: focusLabel,

        completed: !!completed

    });

    focusActive = false;

    focusPaused = false;

    if (completed) {

        focusTimeEl.textContent = "Done.";

        focusLabelEl.textContent =
            focusLabel || "Focus session";

        Aegis.broadcast("petMood", {
            mood: "happy",
            duration: 5000
        });

        setTimeout(focusHideOverlay, 2500);

    } else {

        focusHideOverlay();

    }

    Aegis.broadcast("focusEnded", {

        minutes: Math.round(elapsedSec / 60),

        label: focusLabel,

        completed: !!completed

    });

    Aegis.broadcast("petMood", { mood: "idle" });

    document.title = "AEGIS";

}


function stop() {

    focusFinish(false);

}


function getStatus() {

    return {

        active: focusActive,

        paused: focusPaused,

        label: focusLabel,

        remainingSec: focusRemainingSec,

        totalSec: focusTotalSec

    };

}


function getSessions() {

    return focusLoadSessions();

}


function getWeekMinutes() {

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return focusLoadSessions()
        .filter((s) => {

            return new Date(s.startedAt).getTime() >= weekAgo;

        })
        .reduce((sum, s) => sum + (s.minutes || 0), 0);

}


function focusBuildButton() {

    focusBtn = document.createElement("button");

    focusBtn.textContent = "FOCUS";

    Object.assign(focusBtn.style, {

        position: "fixed",

        left: "24px",

        bottom: "24px",

        zIndex: "9001",

        padding: "12px 22px",

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: "rgba(10, 20, 40, 0.85)",

        color: "#9fdcff",

        fontSize: "14px",

        letterSpacing: "3px",

        cursor: "pointer",

        backdropFilter: "blur(6px)"

    });

    focusBtn.addEventListener("click", focusOpenSetup);

    document.body.appendChild(focusBtn);

}


function focusOpenSetup() {

    const label = prompt("What are you focusing on?", "");

    if (label === null) return;

    const choice = prompt(
        `How many minutes?\n${FOCUS_PRESETS.join(" / ")}`,
        "25"
    );

    if (choice === null) return;

    const minutes = parseInt(choice, 10);

    start(
        isNaN(minutes) ? 25 : minutes,
        label
    );

}


function focusBuildOverlay() {

    focusOverlay = document.createElement("div");

    Object.assign(focusOverlay.style, {

        position: "fixed",

        inset: "0",

        zIndex: "9000",

        display: "none",

        alignItems: "center",

        justifyContent: "center",

        flexDirection: "column",

        gap: "18px",

        background: "rgba(2, 6, 16, 0.92)",

        backdropFilter: "blur(8px)"

    });

    focusLabelEl = document.createElement("div");

    Object.assign(focusLabelEl.style, {

        color: "#9fdcff",

        fontSize: "18px",

        letterSpacing: "2px"

    });

    focusTimeEl = document.createElement("div");

    Object.assign(focusTimeEl.style, {

        color: "#eaf7ff",

        fontSize: "96px",

        fontWeight: "200",

        fontVariantNumeric: "tabular-nums",

        textShadow: "0 0 40px rgba(80, 210, 255, 0.6)"

    });

    focusTimeEl.textContent = "25:00";

    const row = document.createElement("div");

    row.style.display = "flex";

    row.style.gap = "12px";

    focusPauseBtn = document.createElement("button");

    focusPauseBtn.textContent = "Pause";

    const endBtn = document.createElement("button");

    endBtn.textContent = "End";

    [focusPauseBtn, endBtn].forEach((b) => {

        Object.assign(b.style, {

            padding: "10px 28px",

            borderRadius: "999px",

            border: "1px solid rgba(80, 210, 255, 0.4)",

            background: "transparent",

            color: "#9fdcff",

            fontSize: "14px",

            letterSpacing: "2px",

            cursor: "pointer"

        });

    });

    focusPauseBtn.addEventListener("click", () => {

        if (focusPaused) {

            resume();

        } else {

            pause();

        }

    });

    endBtn.addEventListener("click", stop);

    row.appendChild(focusPauseBtn);

    row.appendChild(endBtn);

    const hint = document.createElement("div");

    hint.textContent = "FOCUS PROTOCOL ENGAGED";

    Object.assign(hint.style, {

        color: "rgba(159, 220, 255, 0.4)",

        fontSize: "11px",

        letterSpacing: "5px"

    });

    focusOverlay.appendChild(hint);

    focusOverlay.appendChild(focusLabelEl);

    focusOverlay.appendChild(focusTimeEl);

    focusOverlay.appendChild(row);

    document.body.appendChild(focusOverlay);

}


Aegis.register("focus", {

    version: "1.0.0",


    start,

    pause,

    resume,

    stop,

    getStatus,

    getSessions,

    getWeekMinutes,


    init() {

        focusBuildButton();

        focusBuildOverlay();

        console.log("Focus initialized.");

    },


    refresh() {},


    shutdown() {

        clearInterval(focusTimer);

        if (focusBtn && focusBtn.parentNode) {

            focusBtn.parentNode.removeChild(focusBtn);

        }

        if (focusOverlay && focusOverlay.parentNode) {

            focusOverlay.parentNode.removeChild(focusOverlay);

        }

        document.title = "AEGIS";

    },


    status() {

        return {

            online: true,

            version: this.version,

            active: focusActive,

            weekMinutes: getWeekMinutes()

        };

    }

});
