/*======================================
        AEGIS FOCUS PROTOCOL v1.3.0
======================================

    One-tap focus mode for AEGIS.

    SETUP:
    1. Save this file as JS/focus.js
    2. Save timer.js as JS/timer.js
    3. Add <script src="JS/timer.js"></script> after core.js,
       then <script src="JS/focus.js"></script> after that.
       (Focus uses the timer module as its countdown backend.)

    USE:
    - Tap the FOCUS button (bottom-left) to open the in-app
      setup window: editable label, hours / minutes / seconds
      dropdowns, Start / Cancel. Draggable by its title bar.
    - Or: Aegis.run("focus", "start", 25, "Bible study")
    - Or: Aegis.run("focus", "startSeconds", 90, "Quick sprint")
    - Aegis.run("focus", "stop")
    - Aegis.run("focus", "getWeekMinutes")

    INTEGRATION:
    - Broadcasts "focusStarted" / "focusEnded".
    - Tells the pet to sleep during focus and celebrate
      after (works on both pets when linked).
    - Sessions are stored locally, no AI, no backend.

======================================*/


const FOCUS_STORE_KEY = "aegisFocusSessions";


let focusActive = false;

let focusPaused = false;

let focusLabel = "";

let focusTotalSec = 0;

let focusRemainingSec = 0;

let focusStartedAt = null;

let focusBtn = null;

let focusOverlay = null;

let focusTimeEl = null;

let focusLabelEl = null;

let focusPauseBtn = null;

let focusSetupWin = null;

let focusSetupLabelInput = null;

let focusSetupHourSel = null;

let focusSetupMinSel = null;

let focusSetupSecSel = null;

let focusSetupTimeRow = null;

/* True while focusFinish is running its own timer stop, so the
   "timerStopped" listener doesn't re-enter on our own stop. */

let focusFinishing = false;

let focusTimerStopUnsub = null;


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


/* The timer module calls this every second with the time left. */

function focusTimerTick(remainingSec) {

    focusRemainingSec = remainingSec;

    focusRender();

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


function startSeconds(totalSec, label = "") {

    if (focusActive) return;

    focusCloseSetup();

    totalSec = Math.max(1, Math.round(totalSec) || 1500);

    if (!Aegis.modules.timer) {

        console.error(
            "Focus: timer module not loaded — " +
            "add <script src=\"JS/timer.js\"></script> before focus.js."
        );

        return;

    }

    focusActive = true;

    focusPaused = false;

    focusLabel = String(label || "").slice(0, 60);

    focusTotalSec = totalSec;

    focusRemainingSec = totalSec;

    focusStartedAt = new Date().toISOString();

    focusLabelEl.textContent = focusLabel || "Focus session";

    focusPauseBtn.textContent = "Pause";

    focusShowOverlay();

    focusRender();

    Aegis.run("timer", "start", totalSec, {

        onTick: focusTimerTick,

        onDone: () => focusFinish(true)

    });

    Aegis.broadcast("focusStarted", {

        seconds: totalSec,

        minutes: Math.round(totalSec / 60),

        label: focusLabel

    });

    Aegis.broadcast("petMood", { mood: "sleep" });

    console.log(`Focus started: ${focusFmt(totalSec)}. (timer backend)`);

}


function focusStart(minutes = 25, label = "") {

    startSeconds(
        Math.max(1, Math.round(minutes) || 25) * 60,
        label
    );

}


function focusPause() {

    if (!focusActive || focusPaused) return;

    if (Aegis.modules.timer) {

        Aegis.run("timer", "pause");

    }

    focusPaused = true;

    focusPauseBtn.textContent = "Resume";

    focusRender();

}


function focusResume() {

    if (!focusActive || !focusPaused) return;

    if (Aegis.modules.timer) {

        Aegis.run("timer", "resume");

    }

    focusPaused = false;

    focusPauseBtn.textContent = "Pause";

    focusRender();

}


function focusFinish(completed) {

    if (!focusActive) return;

    focusFinishing = true;

    if (Aegis.modules.timer) {

        Aegis.run("timer", "stop");

    }

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

        /* Wake the pet first (base mood back to idle), then
           celebrate — the timed happy reverts to idle on its
           own instead of being canceled instantly. */

        Aegis.broadcast("petMood", { mood: "idle" });

        Aegis.broadcast("petMood", {
            mood: "happy",
            duration: 5000
        });

        setTimeout(focusHideOverlay, 2500);

    } else {

        focusHideOverlay();

        Aegis.broadcast("petMood", { mood: "idle" });

    }

    Aegis.broadcast("focusEnded", {

        minutes: Math.round(elapsedSec / 60),

        label: focusLabel,

        completed: !!completed

    });

    document.title = "AEGIS";

    focusFinishing = false;

}


function focusStop() {

    focusFinish(false);

}


function focusGetStatus() {

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

    if (focusActive) return;

    focusSetupWin.style.display = "block";

    focusSetupLabelInput.value = "";

    setTimeout(() => focusSetupLabelInput.focus(), 0);

}


/* In-app setup window — replaces the old native prompt()
   popups. A small editable panel with a label field,
   hours / minutes / seconds dropdowns, and Start / Cancel.
   Draggable by its title bar. */

function focusStyleActionBtn(btn, primary) {

    Object.assign(btn.style, {

        flex: "1",

        padding: "12px 0",

        borderRadius: "999px",

        cursor: "pointer",

        fontSize: "13px",

        letterSpacing: "2px",

        color: "#9fdcff",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: primary
            ? "rgba(80, 210, 255, 0.2)"
            : "transparent"

    });

}


function focusCloseSetup() {

    if (focusSetupWin) {

        focusSetupWin.style.display = "none";

    }

}


function focusSetupTotalSec() {

    const h = parseInt(focusSetupHourSel.value, 10) || 0;

    const m = parseInt(focusSetupMinSel.value, 10) || 0;

    const s = parseInt(focusSetupSecSel.value, 10) || 0;

    return h * 3600 + m * 60 + s;

}


function focusSetupStart() {

    const totalSec = focusSetupTotalSec();

    if (totalSec < 1) {

        /* Nudge: flash the dropdowns instead of starting a 0s session. */

        [focusSetupHourSel, focusSetupMinSel, focusSetupSecSel].forEach((sel) => {

            sel.style.border = "1px solid rgba(255, 90, 90, 0.8)";

            setTimeout(() => {

                sel.style.border = "1px solid rgba(80, 210, 255, 0.3)";

            }, 800);

        });

        return;

    }

    const label = focusSetupLabelInput.value.trim();

    focusCloseSetup();

    startSeconds(totalSec, label);

}


function focusBuildSetupWindow() {

    focusSetupWin = document.createElement("div");

    Object.assign(focusSetupWin.style, {

        position: "fixed",

        left: "50%",

        top: "50%",

        transform: "translate(-50%, -50%)",

        zIndex: "9002",

        display: "none",

        width: "340px",

        padding: "0 24px 24px",

        borderRadius: "16px",

        border: "1px solid rgba(80, 210, 255, 0.4)",

        background: "rgba(8, 16, 32, 0.96)",

        backdropFilter: "blur(10px)",

        boxShadow: "0 0 60px rgba(80, 210, 255, 0.25)",

        color: "#9fdcff"

    });

    const handle = document.createElement("div");

    handle.textContent = "FOCUS PROTOCOL";

    Object.assign(handle.style, {

        fontSize: "12px",

        letterSpacing: "5px",

        color: "rgba(159, 220, 255, 0.7)",

        textAlign: "center",

        padding: "16px 0",

        cursor: "grab",

        userSelect: "none"

    });

    const labelTitle = document.createElement("div");

    labelTitle.textContent = "What are you focusing on?";

    Object.assign(labelTitle.style, {

        fontSize: "13px",

        marginBottom: "8px"

    });

    focusSetupLabelInput = document.createElement("input");

    focusSetupLabelInput.type = "text";

    focusSetupLabelInput.placeholder = "e.g. Bible study";

    focusSetupLabelInput.maxLength = 60;

    Object.assign(focusSetupLabelInput.style, {

        width: "100%",

        boxSizing: "border-box",

        padding: "10px 12px",

        borderRadius: "10px",

        border: "1px solid rgba(80, 210, 255, 0.3)",

        background: "rgba(2, 8, 20, 0.8)",

        color: "#eaf7ff",

        fontSize: "14px",

        outline: "none",

        marginBottom: "16px"

    });

    const minTitle = document.createElement("div");

    minTitle.textContent = "How long?";

    Object.assign(minTitle.style, {

        fontSize: "13px",

        marginBottom: "8px"

    });

    /* Three dropdowns — hours, minutes, seconds. */

    focusSetupTimeRow = document.createElement("div");

    Object.assign(focusSetupTimeRow.style, {

        display: "flex",

        gap: "8px",

        marginBottom: "20px"

    });

    function focusMakeTimeSelect(max, label, def) {

        const wrap = document.createElement("div");

        Object.assign(wrap.style, {

            flex: "1",

            display: "flex",

            flexDirection: "column",

            gap: "4px"

        });

        const sel = document.createElement("select");

        for (let v = 0; v <= max; v++) {

            const opt = document.createElement("option");

            opt.value = String(v);

            opt.textContent = String(v).padStart(2, "0");

            sel.appendChild(opt);

        }

        sel.value = String(def);

        Object.assign(sel.style, {

            width: "100%",

            boxSizing: "border-box",

            padding: "10px 8px",

            borderRadius: "10px",

            border: "1px solid rgba(80, 210, 255, 0.3)",

            background: "rgba(2, 8, 20, 0.8)",

            color: "#eaf7ff",

            fontSize: "14px",

            outline: "none",

            cursor: "pointer"

        });

        const cap = document.createElement("div");

        cap.textContent = label;

        Object.assign(cap.style, {

            fontSize: "10px",

            letterSpacing: "3px",

            color: "rgba(159, 220, 255, 0.5)",

            textAlign: "center"

        });

        wrap.appendChild(sel);

        wrap.appendChild(cap);

        focusSetupTimeRow.appendChild(wrap);

        return sel;

    }

    focusSetupHourSel = focusMakeTimeSelect(23, "HRS", 0);

    focusSetupMinSel = focusMakeTimeSelect(59, "MIN", 25);

    focusSetupSecSel = focusMakeTimeSelect(59, "SEC", 0);

    const btnRow = document.createElement("div");

    Object.assign(btnRow.style, {

        display: "flex",

        gap: "10px"

    });

    const startBtn = document.createElement("button");

    startBtn.textContent = "START";

    focusStyleActionBtn(startBtn, true);

    startBtn.addEventListener("click", focusSetupStart);

    const cancelBtn = document.createElement("button");

    cancelBtn.textContent = "CANCEL";

    focusStyleActionBtn(cancelBtn, false);

    cancelBtn.addEventListener("click", focusCloseSetup);

    btnRow.appendChild(startBtn);

    btnRow.appendChild(cancelBtn);

    focusSetupWin.appendChild(handle);

    focusSetupWin.appendChild(labelTitle);

    focusSetupWin.appendChild(focusSetupLabelInput);

    focusSetupWin.appendChild(minTitle);

    focusSetupWin.appendChild(focusSetupTimeRow);

    focusSetupWin.appendChild(btnRow);

    document.body.appendChild(focusSetupWin);

    /* Enter starts, Escape closes. */

    focusSetupWin.addEventListener("keydown", (event) => {

        if (event.key === "Enter") {

            focusSetupStart();

        } else if (event.key === "Escape") {

            focusCloseSetup();

        }

    });

    /* Drag the window by its title bar. */

    let dragging = false;

    let offX = 0;

    let offY = 0;

    handle.addEventListener("pointerdown", (event) => {

        dragging = true;

        offX = event.clientX - focusSetupWin.offsetLeft;

        offY = event.clientY - focusSetupWin.offsetTop;

        handle.style.cursor = "grabbing";

        handle.setPointerCapture(event.pointerId);

    });

    handle.addEventListener("pointermove", (event) => {

        if (!dragging) return;

        focusSetupWin.style.left = `${event.clientX - offX}px`;

        focusSetupWin.style.top = `${event.clientY - offY}px`;

        focusSetupWin.style.transform = "none";

    });

    const endDrag = () => {

        dragging = false;

        handle.style.cursor = "grab";

    };

    handle.addEventListener("pointerup", endDrag);

    handle.addEventListener("pointercancel", endDrag);

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

            focusResume();

        } else {

            focusPause();

        }

    });

    endBtn.addEventListener("click", focusStop);

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

    version: "1.3.0",


    start: focusStart,

    startSeconds,

    pause: focusPause,

    resume: focusResume,

    stop: focusStop,

    getStatus: focusGetStatus,

    getSessions,

    getWeekMinutes,


    init() {

        focusBuildButton();

        focusBuildOverlay();

        focusBuildSetupWindow();

        /* If the timer is stopped out from under us (e.g. the
           timer widget's STOP button), end the session as
           incomplete instead of leaving it frozen. */

        focusTimerStopUnsub = Aegis.listen("timerStopped", () => {

            if (focusActive && !focusFinishing) {

                focusFinish(false);

            }

        });

        console.log("Focus initialized.");

    },


    refresh() {},


    shutdown() {

        if (focusTimerStopUnsub) {

            try { focusTimerStopUnsub(); } catch (error) {}

            focusTimerStopUnsub = null;

        }

        if (Aegis.modules.timer) {

            Aegis.run("timer", "stop");

        }

        if (focusBtn && focusBtn.parentNode) {

            focusBtn.parentNode.removeChild(focusBtn);

        }

        if (focusOverlay && focusOverlay.parentNode) {

            focusOverlay.parentNode.removeChild(focusOverlay);

        }

        if (focusSetupWin && focusSetupWin.parentNode) {

            focusSetupWin.parentNode.removeChild(focusSetupWin);

        }

        focusSetupWin = null;

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
