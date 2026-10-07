/*======================================
        AEGIS PRAYER JOURNAL v1.0.0
======================================

    A simple prayer journal for AEGIS: log prayer requests,
    track the ones God answers, and look back on them.

    SETUP:
    1. Save this file as JS/prayer.js
    2. Add <script src="JS/prayer.js"></script> after core.js
       (anywhere after core.js works)

    USE:
    - Tap the 🙏 pill (bottom-left, above the timer pill) to
      open the journal panel: add a prayer (optional title +
      text), filter All / Active / Answered, mark answered,
      reopen, edit, or delete. Draggable by its title bar.
      Escape closes it.
    - Or:
      const id = Aegis.run("prayer", "add",
          "Wisdom for the big decision at work",
          "Big decision");
      Aegis.run("prayer", "list", "active");
      Aegis.run("prayer", "markAnswered", id, "Got the answer!");
      Aegis.run("prayer", "reopen", id);
      Aegis.run("prayer", "edit", id, { title: "New title" });
      Aegis.run("prayer", "remove", id);
      Aegis.run("prayer", "search", "wisdom");
      Aegis.run("prayer", "count");      // {total, active, answered}
      Aegis.run("prayer", "getStatus");

    - v1.0.0: mobile layout — the pill shrinks and sits above
      the phone's bottom nav bar (safe-area aware); the panel
      fits narrow screens. The pill hides while the timer or
      prayer panels are open.

    Every prayer: { id, title, text, createdAt,
                    status: "active" | "answered",
                    answeredAt, answeredNote }.

    Prayers persist in localStorage ("aegisPrayerJournal").
    No AI, no backend.

    BROADCASTS:
    - "prayerAdded"    { id, title }
    - "prayerAnswered" { id, title }
    - "prayerReopened" { id }
    - "prayerEdited"   { id }
    - "prayerRemoved"  { id }

    Marking a prayer answered makes POTATO celebrate (a happy
    flash) when the pet module is available.

======================================*/


const PRAYER_STORE_KEY = "aegisPrayerJournal";

const PRAYER_MAX_TITLE = 80;

const PRAYER_MAX_TEXT = 2000;


let prayers = [];

let prayerSeq = 0;

let prayerFilter = "all";

let prayerPill = null;

let prayerPanel = null;

let prayerPanelOpen = false;

let prayerListEl = null;

let prayerBadgeEl = null;

let prayerTitleInput = null;

let prayerTextInput = null;

let prayerSearchInput = null;

let prayerSearchQuery = "";


/* ---------- storage ---------- */


function prayerLoad() {

    try {

        const raw = localStorage.getItem(PRAYER_STORE_KEY);

        if (!raw) return;

        const data = JSON.parse(raw);

        if (Array.isArray(data.prayers)) {

            prayers = data.prayers.filter(prayerValid);

        }

    } catch (error) {}

}


function prayerSave() {

    try {

        localStorage.setItem(
            PRAYER_STORE_KEY,
            JSON.stringify({ prayers: prayers })
        );

    } catch (error) {}

}


function prayerValid(p) {

    return p && typeof p.id === "string" &&
        typeof p.text === "string" &&
        (p.status === "active" || p.status === "answered");

}


/* ---------- helpers ---------- */


function prayerNow() {

    return new Date().toISOString();

}


function prayerNewId() {

    prayerSeq += 1;

    return "prayer-" + Date.now().toString(36) + "-" + prayerSeq;

}


function prayerFind(id) {

    return prayers.find((p) => p.id === id) || null;

}


function prayerCopy(p) {

    return JSON.parse(JSON.stringify(p));

}


function prayerDateLabel(iso) {

    try {

        const d = new Date(iso);

        return d.toLocaleDateString(undefined, {

            month: "short",

            day: "numeric",

            year: "numeric"

        });

    } catch (error) {

        return "";

    }

}


function prayerCelebrate() {

    /* POTATO joins the joy when a prayer is answered. */

    try {

        Aegis.run("pet", "setMood", "happy", 4000);

    } catch (error) {}

}


/* ---------- data API ---------- */


function add(text, title) {

    text = String(text || "").trim();

    if (!text) return null;

    title = String(title || "").trim().slice(0, PRAYER_MAX_TITLE);

    const p = {

        id: prayerNewId(),

        title: title,

        text: text.slice(0, PRAYER_MAX_TEXT),

        createdAt: prayerNow(),

        status: "active",

        answeredAt: null,

        answeredNote: ""

    };

    prayers.unshift(p);

    prayerSave();

    prayerRefreshUI();

    Aegis.broadcast("prayerAdded", { id: p.id, title: p.title });

    return p.id;

}


function list(filter) {

    filter = filter || prayerFilter || "all";

    let out = prayers;

    if (filter === "active" || filter === "answered") {

        out = prayers.filter((p) => p.status === filter);

    }

    if (prayerSearchQuery) {

        const q = prayerSearchQuery.toLowerCase();

        out = out.filter((p) =>
            p.title.toLowerCase().includes(q) ||
            p.text.toLowerCase().includes(q) ||
            (p.answeredNote || "").toLowerCase().includes(q)
        );

    }

    return out.map(prayerCopy);

}


function get(id) {

    const p = prayerFind(id);

    return p ? prayerCopy(p) : null;

}


function markAnswered(id, note) {

    const p = prayerFind(id);

    if (!p || p.status === "answered") return false;

    p.status = "answered";

    p.answeredAt = prayerNow();

    p.answeredNote =
        String(note || "").trim().slice(0, PRAYER_MAX_TEXT);

    prayerSave();

    prayerRefreshUI();

    prayerCelebrate();

    Aegis.broadcast(
        "prayerAnswered",
        { id: p.id, title: p.title }
    );

    return true;

}


function reopen(id) {

    const p = prayerFind(id);

    if (!p || p.status === "active") return false;

    p.status = "active";

    p.answeredAt = null;

    p.answeredNote = "";

    prayerSave();

    prayerRefreshUI();

    Aegis.broadcast("prayerReopened", { id: p.id });

    return true;

}


function edit(id, changes) {

    const p = prayerFind(id);

    if (!p || !changes) return false;

    let touched = false;

    if (typeof changes.title === "string") {

        p.title =
            changes.title.trim().slice(0, PRAYER_MAX_TITLE);

        touched = true;

    }

    if (typeof changes.text === "string") {

        const t = changes.text.trim();

        if (t) {

            p.text = t.slice(0, PRAYER_MAX_TEXT);

            touched = true;

        }

    }

    if (!touched) return false;

    prayerSave();

    prayerRefreshUI();

    Aegis.broadcast("prayerEdited", { id: p.id });

    return true;

}


function remove(id) {

    const i = prayers.findIndex((p) => p.id === id);

    if (i < 0) return false;

    prayers.splice(i, 1);

    prayerSave();

    prayerRefreshUI();

    Aegis.broadcast("prayerRemoved", { id: id });

    return true;

}


function search(q) {

    prayerSearchQuery = String(q || "").trim().toLowerCase();

    prayerRefreshUI();

    return list(prayerFilter);

}


function count() {

    return {

        total: prayers.length,

        active: prayers.filter((p) => p.status === "active").length,

        answered:
            prayers.filter((p) => p.status === "answered").length

    };

}


function getStatus() {

    return Object.assign(count(), {

        filter: prayerFilter,

        panelOpen: prayerPanelOpen

    });

}


/* ---------- UI ---------- */


function prayerIsPortraitPhone() {

    try {

        return window.matchMedia("(max-width: 640px)").matches;

    } catch (error) {

        return false;

    }

}


function prayerTimerPanelOpen() {

    try {

        const panel = document.getElementById("aegis-timer-panel");

        return !!panel && panel.style.display !== "none";

    } catch (error) {

        return false;

    }

}


function prayerStyle(el, styles) {

    for (const k in styles) {

        el.style[k] = styles[k];

    }

}


function prayerBuildPill() {

    prayerPill = document.createElement("button");

    prayerPill.id = "aegis-prayer-pill";

    prayerPill.textContent = "🙏";

    prayerPill.title = "Prayer Journal";

    prayerStyle(prayerPill, {

        position: "fixed",

        left: "24px",

        bottom: "136px",

        zIndex: "9002",

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: "rgba(10, 20, 40, 0.85)",

        color: "#9fdcff",

        fontSize: "20px",

        padding: "10px 14px",

        cursor: "pointer",

        boxSizing: "border-box"

    });

    prayerBadgeEl = document.createElement("span");

    prayerStyle(prayerBadgeEl, {

        position: "absolute",

        top: "-6px",

        right: "-6px",

        minWidth: "20px",

        height: "20px",

        borderRadius: "999px",

        background: "rgba(80, 210, 255, 0.9)",

        color: "#06121f",

        fontSize: "11px",

        fontWeight: "bold",

        display: "none",

        alignItems: "center",

        justifyContent: "center",

        padding: "0 5px",

        boxSizing: "border-box"

    });

    prayerPill.appendChild(prayerBadgeEl);

    prayerPill.addEventListener("click", () => togglePanel());

    document.body.appendChild(prayerPill);

    prayerApplyMobile();

    window.addEventListener("resize", prayerApplyMobile);

}


function prayerApplyMobile() {

    if (!prayerPill || !prayerPanel) return;

    const mobile = prayerIsPortraitPhone();

    if (mobile) {

        prayerStyle(prayerPill, {

            padding: "6px 10px",

            fontSize: "11px",

            bottom: "calc(env(safe-area-inset-bottom, 0px) + 186px)"

        });

        prayerStyle(prayerPanel, {

            left: "12px",

            right: "12px",

            width: "auto",

            bottom: "calc(env(safe-area-inset-bottom, 0px) + 240px)"

        });

    } else {

        prayerStyle(prayerPill, {

            padding: "10px 14px",

            fontSize: "20px",

            bottom: "136px"

        });

        prayerStyle(prayerPanel, {

            left: "24px",

            right: "auto",

            width: "340px",

            bottom: "196px"

        });

    }

}


function prayerUpdatePill() {

    if (!prayerPill) return;

    const c = count();

    if (prayerBadgeEl) {

        if (c.active > 0) {

            prayerBadgeEl.textContent = String(c.active);

            prayerBadgeEl.style.display = "flex";

        } else {

            prayerBadgeEl.style.display = "none";

        }

    }

    /* Hide while the timer panel or the prayer panel is open —
       same convention as the timer chips. */

    const hide = prayerPanelOpen || prayerTimerPanelOpen();

    prayerPill.style.display = hide ? "none" : "";

}


function prayerBuildPanel() {

    prayerPanel = document.createElement("div");

    prayerPanel.id = "aegis-prayer-panel";

    prayerStyle(prayerPanel, {

        position: "fixed",

        left: "24px",

        bottom: "196px",

        width: "340px",

        maxWidth: "92vw",

        maxHeight: "60vh",

        display: "none",

        flexDirection: "column",

        borderRadius: "16px",

        border: "1px solid rgba(80, 210, 255, 0.4)",

        background: "rgba(8, 16, 32, 0.96)",

        color: "#9fdcff",

        zIndex: "9004",

        overflow: "hidden",

        boxSizing: "border-box"

    });


    const bar = document.createElement("div");

    prayerStyle(bar, {

        padding: "10px 14px",

        fontWeight: "bold",

        letterSpacing: "2px",

        fontSize: "13px",

        cursor: "move",

        borderBottom: "1px solid rgba(80, 210, 255, 0.2)",

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center"

    });

    const title = document.createElement("span");

    title.textContent = "🙏 PRAYER JOURNAL";

    const close = document.createElement("button");

    close.textContent = "✕";

    prayerStyle(close, {

        background: "transparent",

        border: "none",

        color: "#9fdcff",

        cursor: "pointer",

        fontSize: "14px"

    });

    close.addEventListener("click", () => closePanel());

    bar.appendChild(title);

    bar.appendChild(close);

    prayerPanel.appendChild(bar);

    prayerMakeDraggable(prayerPanel, bar);


    /* Add form */

    const form = document.createElement("div");

    prayerStyle(form, {

        padding: "10px 14px",

        borderBottom: "1px solid rgba(80, 210, 255, 0.12)",

        display: "flex",

        flexDirection: "column",

        gap: "8px"

    });

    prayerTitleInput = document.createElement("input");

    prayerTitleInput.placeholder = "Title (optional)";

    prayerStyle(prayerTitleInput, {

        borderRadius: "8px",

        border: "1px solid rgba(80, 210, 255, 0.3)",

        background: "rgba(2, 8, 20, 0.8)",

        color: "#eaf7ff",

        padding: "8px 10px",

        fontSize: "13px",

        boxSizing: "border-box"

    });

    prayerTextInput = document.createElement("textarea");

    prayerTextInput.placeholder = "What are you praying for?";

    prayerTextInput.rows = 2;

    prayerStyle(prayerTextInput, {

        borderRadius: "8px",

        border: "1px solid rgba(80, 210, 255, 0.3)",

        background: "rgba(2, 8, 20, 0.8)",

        color: "#eaf7ff",

        padding: "8px 10px",

        fontSize: "13px",

        resize: "vertical",

        boxSizing: "border-box"

    });

    const addBtn = document.createElement("button");

    addBtn.textContent = "ADD PRAYER";

    prayerStyle(addBtn, {

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: "rgba(80, 210, 255, 0.12)",

        color: "#9fdcff",

        padding: "8px 12px",

        fontSize: "12px",

        letterSpacing: "1px",

        cursor: "pointer"

    });

    addBtn.addEventListener("click", () => {

        const id = add(prayerTextInput.value, prayerTitleInput.value);

        if (id) {

            prayerTitleInput.value = "";

            prayerTextInput.value = "";

        } else {

            prayerTextInput.style.border =
                "1px solid rgba(255, 90, 90, 0.8)";

            setTimeout(() => {

                prayerTextInput.style.border =
                    "1px solid rgba(80, 210, 255, 0.3)";

            }, 1200);

        }

    });

    form.appendChild(prayerTitleInput);

    form.appendChild(prayerTextInput);

    form.appendChild(addBtn);

    prayerPanel.appendChild(form);


    /* Filter tabs + search */

    const tabs = document.createElement("div");

    prayerStyle(tabs, {

        display: "flex",

        gap: "6px",

        padding: "10px 14px 4px 14px",

        alignItems: "center"

    });

    ["all", "active", "answered"].forEach((f) => {

        const b = document.createElement("button");

        b.textContent = f.toUpperCase();

        b.dataset.filter = f;

        prayerStyle(b, {

            borderRadius: "999px",

            border: "1px solid rgba(80, 210, 255, 0.35)",

            background: "transparent",

            color: "#9fdcff",

            padding: "5px 10px",

            fontSize: "11px",

            letterSpacing: "1px",

            cursor: "pointer"

        });

        b.addEventListener("click", () => {

            prayerFilter = f;

            prayerRefreshUI();

        });

        tabs.appendChild(b);

    });

    prayerSearchInput = document.createElement("input");

    prayerSearchInput.placeholder = "Search";

    prayerStyle(prayerSearchInput, {

        flex: "1",

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.25)",

        background: "rgba(2, 8, 20, 0.8)",

        color: "#eaf7ff",

        padding: "5px 10px",

        fontSize: "12px",

        boxSizing: "border-box"

    });

    prayerSearchInput.addEventListener("input", () => {

        search(prayerSearchInput.value);

    });

    tabs.appendChild(prayerSearchInput);

    prayerPanel.appendChild(tabs);


    /* List */

    prayerListEl = document.createElement("div");

    prayerStyle(prayerListEl, {

        overflowY: "auto",

        padding: "6px 14px 14px 14px",

        display: "flex",

        flexDirection: "column",

        gap: "10px"

    });

    prayerPanel.appendChild(prayerListEl);


    document.body.appendChild(prayerPanel);

    prayerApplyMobile();


    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape" && prayerPanelOpen) {

            closePanel();

        }

    });

}


function prayerMakeDraggable(panel, handle) {

    let offX = 0;

    let offY = 0;

    let dragging = false;

    handle.addEventListener("pointerdown", (e) => {

        dragging = true;

        offX = e.clientX - panel.offsetLeft;

        offY = e.clientY - panel.offsetTop;

        if (handle.setPointerCapture) {

            try { handle.setPointerCapture(e.pointerId); } catch (err) {}

        }

    });

    handle.addEventListener("pointermove", (e) => {

        if (!dragging) return;

        panel.style.left = (e.clientX - offX) + "px";

        panel.style.top = (e.clientY - offY) + "px";

        panel.style.bottom = "auto";

        panel.style.right = "auto";

    });

    handle.addEventListener("pointerup", () => {

        dragging = false;

    });

}


function prayerRowButton(label, onClick, primary) {

    const b = document.createElement("button");

    b.textContent = label;

    prayerStyle(b, {

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.35)",

        background: primary
            ? "rgba(80, 210, 255, 0.15)"
            : "transparent",

        color: "#9fdcff",

        padding: "4px 10px",

        fontSize: "11px",

        cursor: "pointer"

    });

    b.addEventListener("click", onClick);

    return b;

}


function prayerRenderList() {

    if (!prayerListEl) return;

    prayerListEl.innerHTML = "";

    const items = list(prayerFilter);

    if (items.length === 0) {

        const empty = document.createElement("div");

        empty.textContent = prayerSearchQuery
            ? "No prayers match your search."
            : (prayerFilter === "answered"
                ? "No answered prayers yet."
                : "No prayers here yet. Add one above.");

        prayerStyle(empty, {

            color: "rgba(159, 220, 255, 0.4)",

            fontSize: "13px",

            textAlign: "center",

            padding: "18px 0"

        });

        prayerListEl.appendChild(empty);

        return;

    }

    items.forEach((p) => {

        prayerListEl.appendChild(prayerRenderRow(p));

    });

}


function prayerRenderRow(p) {

    const row = document.createElement("div");

    prayerStyle(row, {

        borderTop: "1px solid rgba(80, 210, 255, 0.12)",

        paddingTop: "10px",

        display: "flex",

        flexDirection: "column",

        gap: "6px"

    });

    const head = document.createElement("div");

    prayerStyle(head, {

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        gap: "8px"

    });

    const title = document.createElement("div");

    title.textContent = p.title || "(untitled)";

    prayerStyle(title, {

        color: "#eaf7ff",

        fontSize: "13px",

        fontWeight: "bold",

        flex: "1"

    });

    const badge = document.createElement("span");

    const answered = p.status === "answered";

    badge.textContent = answered ? "ANSWERED ✓" : "ACTIVE";

    prayerStyle(badge, {

        fontSize: "10px",

        letterSpacing: "1px",

        padding: "3px 8px",

        borderRadius: "999px",

        border: "1px solid " + (answered
            ? "rgba(120, 255, 170, 0.5)"
            : "rgba(80, 210, 255, 0.5)"),

        color: answered ? "#8fffb0" : "#9fdcff"

    });

    head.appendChild(title);

    head.appendChild(badge);

    row.appendChild(head);

    const text = document.createElement("div");

    text.textContent = p.text;

    prayerStyle(text, {

        color: "rgba(234, 247, 255, 0.85)",

        fontSize: "13px",

        whiteSpace: "pre-wrap"

    });

    row.appendChild(text);

    const meta = document.createElement("div");

    let metaText = prayerDateLabel(p.createdAt);

    if (answered && p.answeredAt) {

        metaText += " → answered " + prayerDateLabel(p.answeredAt);

    }

    if (answered && p.answeredNote) {

        metaText += " — " + p.answeredNote;

    }

    meta.textContent = metaText;

    prayerStyle(meta, {

        color: "rgba(159, 220, 255, 0.5)",

        fontSize: "11px"

    });

    row.appendChild(meta);

    const actions = document.createElement("div");

    prayerStyle(actions, {

        display: "flex",

        gap: "6px",

        flexWrap: "wrap"

    });

    if (answered) {

        actions.appendChild(prayerRowButton("REOPEN", () => {

            reopen(p.id);

        }));

    } else {

        actions.appendChild(prayerRowButton("✓ ANSWERED", () => {

            const note = window.prompt
                ? window.prompt("How was it answered? (optional)")
                : "";

            markAnswered(p.id, note || "");

        }, true));

    }

    actions.appendChild(prayerRowButton("EDIT", () => {

        prayerRenderEditRow(row, p);

    }));

    const del = prayerRowButton("DELETE", () => {

        if (del.dataset.armed === "1") {

            remove(p.id);

        } else {

            del.dataset.armed = "1";

            del.textContent = "SURE?";

            setTimeout(() => {

                if (del.isConnected !== false) {

                    del.dataset.armed = "";

                    del.textContent = "DELETE";

                }

            }, 3000);

        }

    });

    actions.appendChild(del);

    row.appendChild(actions);

    return row;

}


function prayerRenderEditRow(row, p) {

    row.innerHTML = "";

    const titleIn = document.createElement("input");

    titleIn.value = p.title || "";

    titleIn.placeholder = "Title (optional)";

    const textIn = document.createElement("textarea");

    textIn.value = p.text;

    textIn.rows = 3;

    [titleIn, textIn].forEach((el) => {

        prayerStyle(el, {

            borderRadius: "8px",

            border: "1px solid rgba(80, 210, 255, 0.3)",

            background: "rgba(2, 8, 20, 0.8)",

            color: "#eaf7ff",

            padding: "8px 10px",

            fontSize: "13px",

            boxSizing: "border-box",

            width: "100%"

        });

    });

    const actions = document.createElement("div");

    prayerStyle(actions, {

        display: "flex",

        gap: "6px"

    });

    actions.appendChild(prayerRowButton("SAVE", () => {

        if (edit(p.id, { title: titleIn.value, text: textIn.value })) {

            /* list re-renders on edit */

        } else {

            textIn.style.border =
                "1px solid rgba(255, 90, 90, 0.8)";

        }

    }, true));

    actions.appendChild(prayerRowButton("CANCEL", () => {

        prayerRenderList();

    }));

    row.appendChild(titleIn);

    row.appendChild(textIn);

    row.appendChild(actions);

}


function prayerRefreshUI() {

    prayerUpdatePill();

    if (prayerPanelOpen) {

        prayerRenderList();

        /* Highlight the active filter tab. */

        try {

            const tabs = prayerPanel.querySelectorAll
                ? prayerPanel.querySelectorAll("[data-filter]")
                : [];

            Array.prototype.forEach.call(tabs, (b) => {

                const on = b.dataset.filter === prayerFilter;

                b.style.background = on
                    ? "rgba(80, 210, 255, 0.15)"
                    : "transparent";

            });

        } catch (error) {}

    }

}


/* ---------- panel open / close ---------- */


function openPanel() {

    if (!prayerPanel) return;

    prayerPanelOpen = true;

    prayerPanel.style.display = "flex";

    prayerRenderList();

    prayerUpdatePill();

}


function closePanel() {

    if (!prayerPanel) return;

    prayerPanelOpen = false;

    prayerPanel.style.display = "none";

    prayerUpdatePill();

}


function togglePanel() {

    if (prayerPanelOpen) {

        closePanel();

    } else {

        openPanel();

    }

}


/* ---------- module ---------- */


Aegis.register("prayer", {

    version: "1.0.0",


    add,

    list,

    get,

    markAnswered,

    reopen,

    edit,

    remove,

    search,

    count,

    getStatus,

    openPanel,

    closePanel,

    togglePanel,


    init() {

        prayerLoad();

        prayerBuildPill();

        prayerBuildPanel();

        prayerUpdatePill();

        console.log("Prayer Journal initialized.");

    },


    refresh() {

        prayerRefreshUI();

    },


    shutdown() {

        if (prayerPill && prayerPill.parentNode) {

            prayerPill.parentNode.removeChild(prayerPill);

        }

        if (prayerPanel && prayerPanel.parentNode) {

            prayerPanel.parentNode.removeChild(prayerPanel);

        }

        prayerPill = null;

        prayerPanel = null;

        prayerPanelOpen = false;

        console.log("Prayer Journal shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            panelOpen: prayerPanelOpen,

            total: prayers.length

        };

    }

});
