/*======================================
        AEGIS TIMER v1.1.0
======================================

    A standalone countdown backend for AEGIS, with a mini
    widget interface (floating pill + control panel).

    SETUP:
    1. Save this file as JS/timer.js
    2. Add <script src="JS/timer.js"></script> after core.js
       (load it BEFORE focus.js — focus uses this module)

    USE:
    - Tap the ⏱ pill (bottom-left, above FOCUS) to open the
      control panel: HRS / MIN / SEC dropdowns + START, or
      PAUSE / RESUME / STOP while running. Draggable by its
      title bar.
    - Or: Aegis.run("timer", "start", 90, {
          onTick: (remainingSec) => { ... },
          onDone: () => { ... }
      });
    - Aegis.run("timer", "pause")
    - Aegis.run("timer", "resume")
    - Aegis.run("timer", "stop")    // stops silently, onDone is NOT fired
    - Aegis.run("timer", "getStatus")

    BROADCASTS (for widgets and other modules):
    - "timerStarted" { seconds }
    - "timerTick"    { remainingSec, totalSec }
    - "timerDone"    { seconds }
    - "timerStopped" {}

    Only one countdown runs at a time — starting a new one
    replaces the old. Callbacks are optional.

======================================*/


let timerActive = false;

let timerPaused = false;

let timerTotalSec = 0;

let timerRemainingSec = 0;

let timerHandle = null;

let timerOnTick = null;

let timerOnDone = null;


function timerClear() {

    if (timerHandle) {

        clearInterval(timerHandle);

        timerHandle = null;

    }

}


function timerTick() {

    if (timerPaused) return;

    timerRemainingSec -= 1;

    Aegis.broadcast("timerTick", {

        remainingSec: timerRemainingSec,

        totalSec: timerTotalSec

    });

    if (timerOnTick) {

        try { timerOnTick(timerRemainingSec); } catch (error) {}

    }

    if (timerRemainingSec <= 0) {

        const done = timerOnDone;

        const secs = timerTotalSec;

        timerStopInternal();

        Aegis.broadcast("timerDone", { seconds: secs });

        if (done) {

            try { done(); } catch (error) {}

        }

    }

}


function timerStart(seconds, callbacks) {

    timerStopInternal();

    seconds = Math.max(1, Math.round(seconds) || 60);

    callbacks = callbacks || {};

    timerActive = true;

    timerPaused = false;

    timerTotalSec = seconds;

    timerRemainingSec = seconds;

    timerOnTick =
        typeof callbacks.onTick === "function" ? callbacks.onTick : null;

    timerOnDone =
        typeof callbacks.onDone === "function" ? callbacks.onDone : null;

    if (timerOnTick) {

        try { timerOnTick(timerRemainingSec); } catch (error) {}

    }

    timerClear();

    timerHandle = setInterval(timerTick, 1000);

    Aegis.broadcast("timerStarted", { seconds: seconds });

    return true;

}


function timerPause() {

    if (!timerActive || timerPaused) return false;

    timerPaused = true;

    return true;

}


function timerResume() {

    if (!timerActive || !timerPaused) return false;

    timerPaused = false;

    return true;

}


/* Silent stop: no broadcast. Used when the timer is being
   replaced or has completed on its own. */

function timerStopInternal() {

    timerClear();

    const wasActive = timerActive;

    timerActive = false;

    timerPaused = false;

    timerOnTick = null;

    timerOnDone = null;

    return wasActive;

}


/* Public stop: broadcasts "timerStopped" so widgets and other
   modules (like focus) can react. onDone is NOT fired. */

function timerStop() {

    const wasActive = timerStopInternal();

    if (wasActive) {

        Aegis.broadcast("timerStopped", {});

    }

    return wasActive;

}


function timerGetStatus() {

    return {

        active: timerActive,

        paused: timerPaused,

        remainingSec: timerRemainingSec,

        totalSec: timerTotalSec

    };

}


/*======================================
    TIMER WIDGET — the timer's mini interface.

    A small floating pill (always visible) shows the countdown;
    tapping it opens a draggable control panel with HRS / MIN /
    SEC dropdowns and START, or PAUSE / RESUME / STOP while a
    countdown is running. It follows the timer via broadcasts,
    so it stays in sync no matter who started the timer
    (the widget itself, focus mode, or Aegis.run calls).
======================================*/


let timerPill = null;

let timerPillTime = null;

let timerPanel = null;

let timerPanelSetupView = null;

let timerPanelActiveView = null;

let timerPanelActiveTime = null;

let timerPanelToggleBtn = null;

let timerPanelHourSel = null;

let timerPanelMinSel = null;

let timerPanelSecSel = null;

let timerWidgetUnsubs = [];


function timerFmt(sec) {

    sec = Math.max(0, Math.round(sec));

    const h = Math.floor(sec / 3600);

    const m = Math.floor((sec % 3600) / 60);

    const s = sec % 60;

    const mm = String(m).padStart(2, "0");

    const ss = String(s).padStart(2, "0");

    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;

}


function timerWidgetUpdate(remainingSec) {

    const t = timerFmt(remainingSec);

    if (timerPillTime) {

        timerPillTime.textContent = t;

    }

    if (timerPanelActiveTime) {

        timerPanelActiveTime.textContent = t;

    }

}


function timerWidgetSetActive(active) {

    if (!timerPanel) return;

    timerPanelSetupView.style.display = active ? "none" : "block";

    timerPanelActiveView.style.display = active ? "block" : "none";

    if (!active && timerPillTime) {

        timerPillTime.textContent = "--:--";

    }

}


function timerStyleBtn(btn, primary) {

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


function timerWidgetMakeSelect(max, def) {

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

    return sel;

}


function timerBuildWidget() {

    /* The always-visible mini pill. */

    timerPill = document.createElement("button");

    timerPill.id = "aegis-timer-pill";

    Object.assign(timerPill.style, {

        position: "fixed",

        left: "24px",

        bottom: "84px",

        zIndex: "9001",

        display: "flex",

        alignItems: "center",

        gap: "8px",

        padding: "10px 16px",

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: "rgba(10, 20, 40, 0.85)",

        color: "#9fdcff",

        fontSize: "14px",

        letterSpacing: "2px",

        cursor: "pointer",

        backdropFilter: "blur(6px)",

        fontVariantNumeric: "tabular-nums"

    });

    const ico = document.createElement("span");

    ico.textContent = "⏱";

    timerPillTime = document.createElement("span");

    timerPillTime.textContent = "--:--";

    timerPill.appendChild(ico);

    timerPill.appendChild(timerPillTime);

    timerPill.addEventListener("click", () => {

        timerPanel.style.display =
            timerPanel.style.display === "none" ? "block" : "none";

    });

    document.body.appendChild(timerPill);

    /* The popup control panel. */

    timerPanel = document.createElement("div");

    timerPanel.id = "aegis-timer-panel";

    Object.assign(timerPanel.style, {

        position: "fixed",

        left: "24px",

        bottom: "140px",

        zIndex: "9003",

        display: "none",

        width: "300px",

        padding: "0 20px 20px",

        borderRadius: "16px",

        border: "1px solid rgba(80, 210, 255, 0.4)",

        background: "rgba(8, 16, 32, 0.96)",

        backdropFilter: "blur(10px)",

        boxShadow: "0 0 60px rgba(80, 210, 255, 0.25)",

        color: "#9fdcff"

    });

    const bar = document.createElement("div");

    Object.assign(bar.style, {

        display: "flex",

        alignItems: "center",

        justifyContent: "space-between",

        padding: "14px 0",

        cursor: "grab",

        userSelect: "none"

    });

    const title = document.createElement("div");

    title.textContent = "TIMER";

    Object.assign(title.style, {

        fontSize: "12px",

        letterSpacing: "5px",

        color: "rgba(159, 220, 255, 0.7)"

    });

    const close = document.createElement("button");

    close.textContent = "×";

    Object.assign(close.style, {

        border: "none",

        background: "transparent",

        color: "rgba(159, 220, 255, 0.6)",

        fontSize: "18px",

        cursor: "pointer",

        padding: "0 4px"

    });

    close.addEventListener("click", () => {

        timerPanel.style.display = "none";

    });

    bar.appendChild(title);

    bar.appendChild(close);

    timerPanel.appendChild(bar);

    /* Setup view: dropdowns + start. */

    timerPanelSetupView = document.createElement("div");

    const selRow = document.createElement("div");

    Object.assign(selRow.style, {

        display: "flex",

        gap: "8px",

        marginBottom: "16px"

    });

    const defs = [["HRS", 23, 0], ["MIN", 59, 5], ["SEC", 59, 0]];

    const sels = [];

    defs.forEach(([cap, max, def]) => {

        const wrap = document.createElement("div");

        Object.assign(wrap.style, {

            flex: "1",

            display: "flex",

            flexDirection: "column",

            gap: "4px"

        });

        const sel = timerWidgetMakeSelect(max, def);

        const label = document.createElement("div");

        label.textContent = cap;

        Object.assign(label.style, {

            fontSize: "10px",

            letterSpacing: "3px",

            color: "rgba(159, 220, 255, 0.5)",

            textAlign: "center"

        });

        wrap.appendChild(sel);

        wrap.appendChild(label);

        selRow.appendChild(wrap);

        sels.push(sel);

    });

    timerPanelHourSel = sels[0];

    timerPanelMinSel = sels[1];

    timerPanelSecSel = sels[2];

    const startBtn = document.createElement("button");

    startBtn.textContent = "START";

    timerStyleBtn(startBtn, true);

    startBtn.style.width = "100%";

    startBtn.style.boxSizing = "border-box";

    startBtn.addEventListener("click", () => {

        const total =
            (parseInt(timerPanelHourSel.value, 10) || 0) * 3600 +
            (parseInt(timerPanelMinSel.value, 10) || 0) * 60 +
            (parseInt(timerPanelSecSel.value, 10) || 0);

        if (total < 1) {

            [timerPanelHourSel, timerPanelMinSel, timerPanelSecSel].forEach((sel) => {

                sel.style.border = "1px solid rgba(255, 90, 90, 0.8)";

                setTimeout(() => {

                    sel.style.border = "1px solid rgba(80, 210, 255, 0.3)";

                }, 800);

            });

            return;

        }

        timerStart(total);

    });

    timerPanelSetupView.appendChild(selRow);

    timerPanelSetupView.appendChild(startBtn);

    timerPanel.appendChild(timerPanelSetupView);

    /* Active view: big time + pause/resume + stop. */

    timerPanelActiveView = document.createElement("div");

    timerPanelActiveView.style.display = "none";

    timerPanelActiveTime = document.createElement("div");

    timerPanelActiveTime.textContent = "--:--";

    Object.assign(timerPanelActiveTime.style, {

        fontSize: "56px",

        fontWeight: "200",

        textAlign: "center",

        color: "#eaf7ff",

        fontVariantNumeric: "tabular-nums",

        textShadow: "0 0 30px rgba(80, 210, 255, 0.6)",

        marginBottom: "16px"

    });

    const ctlRow = document.createElement("div");

    Object.assign(ctlRow.style, {

        display: "flex",

        gap: "10px"

    });

    timerPanelToggleBtn = document.createElement("button");

    timerPanelToggleBtn.textContent = "PAUSE";

    timerStyleBtn(timerPanelToggleBtn, false);

    timerPanelToggleBtn.addEventListener("click", () => {

        if (timerGetStatus().paused) {

            timerResume();

            timerPanelToggleBtn.textContent = "PAUSE";

        } else {

            timerPause();

            timerPanelToggleBtn.textContent = "RESUME";

        }

    });

    const stopBtn = document.createElement("button");

    stopBtn.textContent = "STOP";

    timerStyleBtn(stopBtn, false);

    stopBtn.addEventListener("click", () => {

        timerStop();

    });

    ctlRow.appendChild(timerPanelToggleBtn);

    ctlRow.appendChild(stopBtn);

    timerPanelActiveView.appendChild(timerPanelActiveTime);

    timerPanelActiveView.appendChild(ctlRow);

    timerPanel.appendChild(timerPanelActiveView);

    document.body.appendChild(timerPanel);

    /* Drag the panel by its title bar. */

    let dragging = false;

    let offX = 0;

    let offY = 0;

    bar.addEventListener("pointerdown", (event) => {

        dragging = true;

        offX = event.clientX - timerPanel.offsetLeft;

        offY = event.clientY - timerPanel.offsetTop;

        bar.style.cursor = "grabbing";

        bar.setPointerCapture(event.pointerId);

    });

    bar.addEventListener("pointermove", (event) => {

        if (!dragging) return;

        timerPanel.style.left = `${event.clientX - offX}px`;

        timerPanel.style.top = `${event.clientY - offY}px`;

        timerPanel.style.bottom = "auto";

    });

    const endDrag = () => {

        dragging = false;

        bar.style.cursor = "grab";

    };

    bar.addEventListener("pointerup", endDrag);

    bar.addEventListener("pointercancel", endDrag);

    /* Follow the timer through broadcasts, so the widget stays
       in sync no matter who started the countdown. */

    timerWidgetUnsubs.push(
        Aegis.listen("timerTick", (d) => timerWidgetUpdate(d.remainingSec)),
        Aegis.listen("timerStarted", (d) => {

            timerPanelToggleBtn.textContent = "PAUSE";

            timerWidgetSetActive(true);

            timerWidgetUpdate(d.seconds);

        }),
        Aegis.listen("timerStopped", () => {

            timerWidgetSetActive(false);

        }),
        Aegis.listen("timerDone", () => {

            timerWidgetSetActive(false);

        })
    );

}


function timerDestroyWidget() {

    timerWidgetUnsubs.forEach((unsub) => {

        try { unsub(); } catch (error) {}

    });

    timerWidgetUnsubs = [];

    if (timerPill && timerPill.parentNode) {

        timerPill.parentNode.removeChild(timerPill);

    }

    if (timerPanel && timerPanel.parentNode) {

        timerPanel.parentNode.removeChild(timerPanel);

    }

    timerPill = null;

    timerPillTime = null;

    timerPanel = null;

    timerPanelSetupView = null;

    timerPanelActiveView = null;

}


Aegis.register("timer", {

    version: "1.1.0",


    start: timerStart,

    pause: timerPause,

    resume: timerResume,

    stop: timerStop,

    getStatus: timerGetStatus,


    init() {

        timerBuildWidget();

        console.log("Timer initialized.");

    },


    refresh() {},


    shutdown() {

        timerStop();

        timerDestroyWidget();

        console.log("Timer shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            active: timerActive,

            paused: timerPaused,

            remainingSec: timerRemainingSec

        };

    }

});
