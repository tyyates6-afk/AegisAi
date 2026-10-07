/*======================================
        AEGIS TIMER v2.0.3
======================================

    Multiple simultaneous countdowns for AEGIS, with a mini
    widget interface (floating pill + control panel).

    SETUP:
    1. Save this file as JS/timer.js
    2. Add <script src="JS/timer.js"></script> after core.js
       (load it BEFORE focus.js — focus uses this module)

    USE:
    - Tap the ⏱ pill (bottom-left, above FOCUS) to open the
      control panel: optional label, HRS / MIN / SEC dropdowns,
      START. Every running timer gets its own row with
      PAUSE / RESUME and STOP. Draggable by its title bar.
    - Or: const id = Aegis.run("timer", "start", 90, {
          label: "Tea",
          onTick: (remainingSec) => { ... },
          onDone: () => { ... }
      });
    - Aegis.run("timer", "pause", id)
    - Aegis.run("timer", "resume", id)
    - Aegis.run("timer", "stop", id)   // onDone is NOT fired
    - Aegis.run("timer", "getStatus", id)  // null if finished
    - Aegis.run("timer", "list")           // all running timers
    - v2.0.1: mobile layout — the pill shrinks and sits above
      the phone's bottom nav bar (safe-area aware); the panel
      fits narrow screens.
    - v2.0.2: running timers stay visible as compact chips
      (label + live time + pause + stop) while the maker
      panel is closed.
    - v2.0.3: smaller still in portrait; landscape (and
      desktop) keep the full-size pill and panel.

    The id may be omitted from pause / resume / stop /
    getStatus — it then targets the most recently started
    timer, so single-timer use stays simple.

    BROADCASTS:
    - "timerStarted" { id, seconds, label }
    - "timerTick"    { id, remainingSec, totalSec, label }
    - "timerPaused"  { id }
    - "timerResumed" { id }
    - "timerDone"    { id, seconds, label }
    - "timerStopped" { id, label }

    One shared 1-second loop drives every timer.

======================================*/


/* id -> { id, label, totalSec, remainingSec, paused,
           onTick, onDone }. Map keeps insertion order, so the
   last entry is always the most recently started timer. */

let timers = new Map();

let timerHandle = null;

let timerSeq = 0;


function timerEnsureLoop() {

    if (!timerHandle) {

        timerHandle = setInterval(timerTickAll, 1000);

    }

}


function timerMaybeStopLoop() {

    if (timers.size === 0 && timerHandle) {

        clearInterval(timerHandle);

        timerHandle = null;

    }

}


function timerTickAll() {

    timers.forEach((t) => {

        if (t.paused) return;

        t.remainingSec -= 1;

        Aegis.broadcast("timerTick", {

            id: t.id,

            remainingSec: t.remainingSec,

            totalSec: t.totalSec,

            label: t.label

        });

        if (t.onTick) {

            try { t.onTick(t.remainingSec); } catch (error) {}

        }

        if (t.remainingSec <= 0) {

            const done = t.onDone;

            const secs = t.totalSec;

            const label = t.label;

            const id = t.id;

            timers.delete(id);

            timerMaybeStopLoop();

            Aegis.broadcast("timerDone", {

                id: id,

                seconds: secs,

                label: label

            });

            if (done) {

                try { done(); } catch (error) {}

            }

        }

    });

}


function timerStart(seconds, callbacks) {

    callbacks = callbacks || {};

    seconds = Math.max(1, Math.round(seconds) || 60);

    timerSeq += 1;

    const id =
        "timer-" + Date.now().toString(36) + "-" + timerSeq;

    const t = {

        id: id,

        label: String(callbacks.label || "").slice(0, 40),

        totalSec: seconds,

        remainingSec: seconds,

        paused: false,

        onTick:
            typeof callbacks.onTick === "function"
                ? callbacks.onTick
                : null,

        onDone:
            typeof callbacks.onDone === "function"
                ? callbacks.onDone
                : null

    };

    timers.set(id, t);

    timerEnsureLoop();

    if (t.onTick) {

        try { t.onTick(t.remainingSec); } catch (error) {}

    }

    Aegis.broadcast("timerStarted", {

        id: id,

        seconds: seconds,

        label: t.label

    });

    return id;

}


/* Most recently started timer still on the board. */

function timerLatestId() {

    let last = null;

    timers.forEach((t) => { last = t.id; });

    return last;

}


/* Resolve an id, defaulting to the most recent timer so
   single-timer callers can omit it. */

function timerResolve(id) {

    if (id == null) {

        id = timerLatestId();

    }

    return (id != null && timers.get(id)) || null;

}


function timerPause(id) {

    const t = timerResolve(id);

    if (!t || t.paused) return false;

    t.paused = true;

    Aegis.broadcast("timerPaused", { id: t.id });

    return true;

}


function timerResume(id) {

    const t = timerResolve(id);

    if (!t || !t.paused) return false;

    t.paused = false;

    Aegis.broadcast("timerResumed", { id: t.id });

    return true;

}


/* Public stop: drops the timer and broadcasts "timerStopped".
   onDone is NOT fired. */

function timerStop(id) {

    const t = timerResolve(id);

    if (!t) return false;

    timers.delete(t.id);

    timerMaybeStopLoop();

    Aegis.broadcast("timerStopped", {

        id: t.id,

        label: t.label

    });

    return true;

}


function timerGetStatus(id) {

    const t = timerResolve(id);

    if (!t) return null;

    return {

        id: t.id,

        label: t.label,

        active: true,

        paused: t.paused,

        remainingSec: t.remainingSec,

        totalSec: t.totalSec

    };

}


function timerList() {

    return [...timers.values()].map((t) => ({

        id: t.id,

        label: t.label,

        paused: t.paused,

        remainingSec: t.remainingSec,

        totalSec: t.totalSec

    }));

}


/*======================================
    TIMER WIDGET — the timer's mini interface.

    A small floating pill (always visible) shows the most
    recently started timer's countdown; tapping it opens a
    draggable control panel: optional label, HRS / MIN / SEC
    dropdowns, START, and one row per running timer with
    PAUSE / RESUME and STOP. It follows the timers via
    broadcasts, so it stays in sync no matter who started
    them (the widget itself, focus mode, or Aegis.run calls).
======================================*/


let timerPill = null;

let timerPillTime = null;

let timerPanel = null;

let timerPanelList = null;

let timerChips = null;

let timerPanelLabelInput = null;

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


/* Rebuild the pill + list from the current timers. The pill
   shows the most recently started timer. */

function timerWidgetSync() {

    const list = timerList();

    const primary = list.length ? list[list.length - 1] : null;

    if (timerPillTime) {

        timerPillTime.textContent =
            primary ? timerFmt(primary.remainingSec) : "--:--";

    }

    timerWidgetRenderList(list);

    timerWidgetRenderChips(list);

}


/* Compact chips that stay visible while the timer maker panel
   is closed — one per running timer, with pause and stop. */

function timerWidgetRenderChips(list) {

    if (!timerChips) return;

    timerChips.innerHTML = "";

    const panelOpen = timerPanel &&
        timerPanel.style.display !== "none";

    timerChips.style.display =
        (!panelOpen && list.length) ? "flex" : "none";

    if (panelOpen || !list.length) return;

    list.forEach((t) => {

        const chip = document.createElement("div");

        const chipMobile = timerIsMobileLayout();

        Object.assign(chip.style, {

            display: "flex",

            alignItems: "center",

            gap: chipMobile ? "5px" : "6px",

            padding: chipMobile ? "5px 7px 5px 10px" : "6px 8px 6px 12px",

            borderRadius: "999px",

            border: "1px solid rgba(80, 210, 255, 0.5)",

            background: "rgba(10, 20, 40, 0.85)",

            color: "#9fdcff",

            fontSize: chipMobile ? "11px" : "12px",

            backdropFilter: "blur(6px)",

            maxWidth: "220px"

        });

        const name = document.createElement("span");

        name.textContent = t.label || "Timer";

        Object.assign(name.style, {

            overflow: "hidden",

            textOverflow: "ellipsis",

            whiteSpace: "nowrap",

            maxWidth: "90px"

        });

        const time = document.createElement("span");

        time.textContent = timerFmt(t.remainingSec);

        Object.assign(time.style, {

            color: "#eaf7ff",

            fontVariantNumeric: "tabular-nums"

        });

        const toggle = document.createElement("button");

        toggle.textContent = t.paused ? "▶" : "⏸";

        timerChipBtn(toggle);

        toggle.title = t.paused ? "Resume" : "Pause";

        toggle.addEventListener("click", () => {

            if (t.paused) {

                timerResume(t.id);

            } else {

                timerPause(t.id);

            }

        });

        const stop = document.createElement("button");

        stop.textContent = "×";

        timerChipBtn(stop);

        stop.title = "Stop";

        stop.addEventListener("click", () => {

            timerStop(t.id);

        });

        chip.appendChild(name);

        chip.appendChild(time);

        chip.appendChild(toggle);

        chip.appendChild(stop);

        timerChips.appendChild(chip);

    });

}


function timerChipBtn(btn) {

    Object.assign(btn.style, {

        padding: "2px 7px",

        borderRadius: "999px",

        cursor: "pointer",

        border: "1px solid rgba(80, 210, 255, 0.35)",

        background: "rgba(80, 210, 255, 0.08)",

        color: "#9fdcff",

        fontSize: "11px",

        lineHeight: "1.4"

    });

}


function timerWidgetRenderList(list) {

    if (!timerPanelList) return;

    timerPanelList.innerHTML = "";

    if (!list.length) {

        const empty = document.createElement("div");

        empty.textContent = "No timers running.";

        Object.assign(empty.style, {

            fontSize: "12px",

            color: "rgba(159, 220, 255, 0.4)",

            textAlign: "center",

            padding: "8px 0"

        });

        timerPanelList.appendChild(empty);

        return;

    }

    list.forEach((t) => {

        const row = document.createElement("div");

        Object.assign(row.style, {

            display: "flex",

            alignItems: "center",

            gap: "8px",

            padding: "8px 0",

            borderTop: "1px solid rgba(80, 210, 255, 0.12)"

        });

        const name = document.createElement("div");

        name.textContent = t.label || "Timer";

        Object.assign(name.style, {

            flex: "1",

            fontSize: "13px",

            overflow: "hidden",

            textOverflow: "ellipsis",

            whiteSpace: "nowrap"

        });

        const time = document.createElement("div");

        time.textContent = timerFmt(t.remainingSec);

        Object.assign(time.style, {

            fontSize: "14px",

            color: "#eaf7ff",

            fontVariantNumeric: "tabular-nums"

        });

        const toggle = document.createElement("button");

        toggle.textContent = t.paused ? "RESUME" : "PAUSE";

        timerRowBtn(toggle);

        toggle.addEventListener("click", () => {

            if (t.paused) {

                timerResume(t.id);

            } else {

                timerPause(t.id);

            }

        });

        const stop = document.createElement("button");

        stop.textContent = "×";

        timerRowBtn(stop);

        stop.addEventListener("click", () => {

            timerStop(t.id);

        });

        row.appendChild(name);

        row.appendChild(time);

        row.appendChild(toggle);

        row.appendChild(stop);

        timerPanelList.appendChild(row);

    });

}


function timerRowBtn(btn) {

    Object.assign(btn.style, {

        padding: "6px 10px",

        borderRadius: "999px",

        cursor: "pointer",

        fontSize: "11px",

        letterSpacing: "1px",

        color: "#9fdcff",

        border: "1px solid rgba(80, 210, 255, 0.35)",

        background: "transparent",

        flexShrink: "0"

    });

}


function timerStyleBtn(btn, primary) {

    Object.assign(btn.style, {

        padding: "12px 0",

        borderRadius: "999px",

        cursor: "pointer",

        fontSize: "13px",

        letterSpacing: "2px",

        color: "#9fdcff",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: primary
            ? "rgba(80, 210, 255, 0.2)"
            : "transparent",

        width: "100%",

        boxSizing: "border-box"

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


function timerWidgetFlash(sels) {

    sels.forEach((sel) => {

        sel.style.border = "1px solid rgba(255, 90, 90, 0.8)";

        setTimeout(() => {

            sel.style.border = "1px solid rgba(80, 210, 255, 0.3)";

        }, 800);

    });

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

        timerWidgetSync();

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

        maxHeight: "60vh",

        overflowY: "auto",

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

    /* New-timer form: optional label + dropdowns + start. */

    timerPanelLabelInput = document.createElement("input");

    timerPanelLabelInput.type = "text";

    timerPanelLabelInput.placeholder = "Label (optional)";

    timerPanelLabelInput.maxLength = 40;

    Object.assign(timerPanelLabelInput.style, {

        width: "100%",

        boxSizing: "border-box",

        padding: "10px 12px",

        borderRadius: "10px",

        border: "1px solid rgba(80, 210, 255, 0.3)",

        background: "rgba(2, 8, 20, 0.8)",

        color: "#eaf7ff",

        fontSize: "14px",

        outline: "none",

        marginBottom: "12px"

    });

    timerPanel.appendChild(timerPanelLabelInput);

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

    timerPanel.appendChild(selRow);

    const startBtn = document.createElement("button");

    startBtn.textContent = "START";

    timerStyleBtn(startBtn, true);

    startBtn.addEventListener("click", () => {

        const total =
            (parseInt(timerPanelHourSel.value, 10) || 0) * 3600 +
            (parseInt(timerPanelMinSel.value, 10) || 0) * 60 +
            (parseInt(timerPanelSecSel.value, 10) || 0);

        if (total < 1) {

            timerWidgetFlash([
                timerPanelHourSel,
                timerPanelMinSel,
                timerPanelSecSel
            ]);

            return;

        }

        timerStart(total, {

            label: timerPanelLabelInput.value.trim()

        });

        timerPanelLabelInput.value = "";

    });

    timerPanel.appendChild(startBtn);

    /* Running timers list. */

    const divider = document.createElement("div");

    Object.assign(divider.style, {

        borderTop: "1px solid rgba(80, 210, 255, 0.15)",

        margin: "16px 0 8px"

    });

    timerPanel.appendChild(divider);

    timerPanelList = document.createElement("div");

    timerPanel.appendChild(timerPanelList);

    document.body.appendChild(timerPanel);

    /* Compact chips for running timers, shown while the
       maker panel is closed. */

    timerChips = document.createElement("div");

    timerChips.id = "aegis-timer-chips";

    Object.assign(timerChips.style, {

        position: "fixed",

        left: "24px",

        bottom: "140px",

        zIndex: "9002",

        display: "none",

        flexDirection: "column",

        gap: "8px",

        alignItems: "flex-start"

    });

    document.body.appendChild(timerChips);

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

    /* Follow the timers through broadcasts, so the widget stays
       in sync no matter who started them. */

    timerWidgetUnsubs.push(
        Aegis.listen("timerStarted", () => timerWidgetSync()),
        Aegis.listen("timerTick", () => timerWidgetSync()),
        Aegis.listen("timerPaused", () => timerWidgetSync()),
        Aegis.listen("timerResumed", () => timerWidgetSync()),
        Aegis.listen("timerDone", () => timerWidgetSync()),
        Aegis.listen("timerStopped", () => timerWidgetSync())
    );

    timerWidgetSync();

    timerApplyResponsive();

}


/* Mobile layout: shrink the timer pill, lift it clear of the
   phone's bottom nav bar (uses the safe-area inset), and keep
   the popup panel inside the viewport. */

function timerIsMobileLayout() {

    return window.innerWidth <= 640;

}


function timerApplyResponsive() {

    const mobile = timerIsMobileLayout();

    if (timerPill) {

        Object.assign(timerPill.style, {

            bottom: mobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 132px)"
                : "84px",

            padding: mobile ? "6px 10px" : "10px 16px",

            fontSize: mobile ? "11px" : "14px",

            letterSpacing: mobile ? "0px" : "2px"

        });

    }

    if (timerPanel) {

        Object.assign(timerPanel.style, {

            width: mobile ? "min(300px, calc(100vw - 48px))" : "300px",

            bottom: mobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 186px)"
                : "140px"

        });

    }

    if (timerChips) {

        Object.assign(timerChips.style, {

            bottom: mobile
                ? "calc(env(safe-area-inset-bottom, 0px) + 186px)"
                : "140px"

        });

    }

}


let timerResizeHooked = false;

function timerHookResize() {

    if (timerResizeHooked) return;

    timerResizeHooked = true;

    window.addEventListener("resize", timerApplyResponsive);

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

    if (timerChips && timerChips.parentNode) {

        timerChips.parentNode.removeChild(timerChips);

    }

    timerPill = null;

    timerPillTime = null;

    timerPanel = null;

    timerPanelList = null;

    timerChips = null;

}


Aegis.register("timer", {

    version: "2.0.0",


    start: timerStart,

    pause: timerPause,

    resume: timerResume,

    stop: timerStop,

    getStatus: timerGetStatus,

    list: timerList,


    init() {

        timerBuildWidget();

        timerHookResize();

        console.log("Timer initialized.");

    },


    refresh() {},


    shutdown() {

        [...timers.keys()].forEach((id) => timerStop(id));

        timerDestroyWidget();

        console.log("Timer shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            count: timers.size

        };

    }

});
