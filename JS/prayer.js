/*======================================
        AEGIS PRAYER JOURNAL v2.0.1
======================================

    A simple prayer journal for AEGIS: log prayer requests,
    track the ones God answers, and look back on them.

    SETUP:
    1. Save this file as JS/prayer.js
    2. Add <script src="JS/prayer.js"></script> after core.js
       (anywhere after core.js works — it hooks into the
       Navigation module at runtime, whatever order they
       initialize in)

    USE:
    - Open the ••• More tab and tap 🙏 Prayer Journal.
      Add a prayer (optional title + text), filter All /
      Active / Answered, search, mark answered, reopen,
      edit, or delete. ← Back to More returns.
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
      Aegis.run("prayer", "open");        // go to the journal page

    - v2.0.0: no more floating 🙏 pill — the journal lives in
      the More hub as a full page, like Planner and Settings.
    - v2.0.1: prayers added without a title default to the
      current date and time (e.g. "Oct 7, 2026, 4:51 PM").

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

const PRAYER_PAGE_NAME = "prayer";


let prayers = [];

let prayerSeq = 0;

let prayerFilter = "all";

let prayerPageEl = null;

let prayerListEl = null;

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


/* Prayers added without a title are named for the moment
   they were added, e.g. "Oct 7, 2026, 4:51 PM". */

function prayerDefaultTitle() {

    try {

        return new Date().toLocaleString(undefined, {

            month: "short",

            day: "numeric",

            year: "numeric",

            hour: "numeric",

            minute: "2-digit"

        });

    } catch (error) {

        return "Prayer";

    }

}


function prayerCelebrate() {

    try {

        Aegis.run("pet", "setMood", "happy", 4000);

    } catch (error) {}

}


function prayerStyle(el, styles) {

    for (const k in styles) {

        el.style[k] = styles[k];

    }

}


/* ---------- navigation ---------- */


function prayerNav() {

    try {

        return window.Navigation || null;

    } catch (error) {

        return null;

    }

}


/* Show the journal page through the Navigation module when
   it's ready; fall back to toggling .aegis-page classes
   directly so the journal works even if Navigation is
   missing or initializes later. */

function prayerShowPage(name) {

    const nav = prayerNav();

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

    try { window.scrollTo(0, 0); } catch (error) {}

}


function open() {

    prayerShowPage(PRAYER_PAGE_NAME);

}


function prayerGoMore() {

    prayerShowPage("more");

}


/* Register the page with Navigation. If Navigation hasn't
   initialized yet, its _buildDOM will pick the page up from
   the DOM itself (it re-queries .aegis-page). If it already
   initialized, push the page into its cached list. */

function prayerHookNavigation() {

    const nav = prayerNav();

    if (!nav || !prayerPageEl) return false;

    try {

        if (nav._els && Array.isArray(nav._els.pages)) {

            if (nav._els.pages.indexOf(prayerPageEl) < 0) {

                nav._els.pages.push(prayerPageEl);

            }

            return true;

        }

    } catch (error) {}

    return false;

}


/* ---------- data API ---------- */


function add(text, title) {

    text = String(text || "").trim();

    if (!text) return null;

    title = String(title || "").trim().slice(0, PRAYER_MAX_TITLE);

    if (!title) {

        title = prayerDefaultTitle();

    }

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

    prayerRenderList();

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

    prayerRenderList();

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

    prayerRenderList();

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

    prayerRenderList();

    Aegis.broadcast("prayerEdited", { id: p.id });

    return true;

}


function remove(id) {

    const i = prayers.findIndex((p) => p.id === id);

    if (i < 0) return false;

    prayers.splice(i, 1);

    prayerSave();

    prayerRenderList();

    Aegis.broadcast("prayerRemoved", { id: id });

    return true;

}


function search(q) {

    prayerSearchQuery = String(q || "").trim().toLowerCase();

    prayerRenderList();

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

        filter: prayerFilter

    });

}


/* ---------- page UI ---------- */


function prayerBuildPage() {

    prayerPageEl = document.createElement("div");

    prayerPageEl.className = "aegis-page";

    prayerPageEl.dataset.page = PRAYER_PAGE_NAME;

    const back = document.createElement("button");

    back.className = "aegis-page-back";

    back.setAttribute("data-back-to", "more");

    back.textContent = "← Back to More";

    back.addEventListener("click", prayerGoMore);

    prayerPageEl.appendChild(back);

    const card = document.createElement("section");

    card.className = "card";

    const h2 = document.createElement("h2");

    h2.textContent = "🙏 Prayer Journal";

    card.appendChild(h2);


    /* Add form */

    const form = document.createElement("div");

    prayerStyle(form, {

        display: "flex",

        flexDirection: "column",

        gap: "8px",

        marginBottom: "12px"

    });

    prayerTitleInput = document.createElement("input");

    prayerTitleInput.placeholder =
        "Title (optional — defaults to date & time)";

    prayerTextInput = document.createElement("textarea");

    prayerTextInput.placeholder = "What are you praying for?";

    prayerTextInput.rows = 2;

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

                prayerTextInput.style.border = "";

            }, 1200);

        }

    });

    form.appendChild(prayerTitleInput);

    form.appendChild(prayerTextInput);

    form.appendChild(addBtn);

    card.appendChild(form);


    /* Filter tabs + search */

    const tabs = document.createElement("div");

    prayerStyle(tabs, {

        display: "flex",

        gap: "6px",

        alignItems: "center",

        marginBottom: "10px",

        flexWrap: "wrap"

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

            prayerRenderList();

        });

        tabs.appendChild(b);

    });

    prayerSearchInput = document.createElement("input");

    prayerSearchInput.placeholder = "Search prayers";

    prayerStyle(prayerSearchInput, {

        flex: "1",

        minWidth: "120px"

    });

    prayerSearchInput.addEventListener("input", () => {

        search(prayerSearchInput.value);

    });

    tabs.appendChild(prayerSearchInput);

    card.appendChild(tabs);


    /* List */

    prayerListEl = document.createElement("div");

    prayerStyle(prayerListEl, {

        display: "flex",

        flexDirection: "column",

        gap: "12px"

    });

    card.appendChild(prayerListEl);

    prayerPageEl.appendChild(card);

    document.body.appendChild(prayerPageEl);


    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape" &&
            prayerPageEl.classList.contains("active")) {

            prayerGoMore();

        }

    });

}


/* Add the 🙏 entry to the More hub. The hub is static HTML,
   so this works whether or not Navigation initialized. */

function prayerAddMoreEntry() {

    try {

        const hubList = document.querySelector(".aegis-more-list");

        if (!hubList) return false;

        if (hubList.querySelector('[data-goto-page="prayer"]')) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", PRAYER_PAGE_NAME);

        item.textContent = "🙏 Prayer Journal";

        item.addEventListener("click", open);

        /* Sit with the other pages, above the dashboard tools. */

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

        const empty = document.createElement("p");

        empty.className = "empty-state";

        empty.textContent = prayerSearchQuery
            ? "No prayers match your search."
            : (prayerFilter === "answered"
                ? "No answered prayers yet."
                : "No prayers here yet. Add one above.");

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

        fontSize: "14px",

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

        fontSize: "14px",

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

    prayerStyle(textIn, { width: "100%" });

    const actions = document.createElement("div");

    prayerStyle(actions, {

        display: "flex",

        gap: "6px"

    });

    actions.appendChild(prayerRowButton("SAVE", () => {

        if (!edit(p.id, { title: titleIn.value, text: textIn.value })) {

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


/* ---------- module ---------- */


Aegis.register("prayer", {

    version: "2.0.1",


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

    open,


    init() {

        prayerLoad();

        prayerBuildPage();

        prayerAddMoreEntry();

        prayerRenderList();

        /* Navigation may init before or after this module —
           hook up now, and retry briefly if it's not ready. */

        if (!prayerHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (prayerHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        console.log("Prayer Journal initialized.");

    },


    refresh() {

        prayerRenderList();

    },


    shutdown() {

        if (prayerPageEl && prayerPageEl.parentNode) {

            prayerPageEl.parentNode.removeChild(prayerPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="prayer"]'
            );

            if (entry && entry.parentNode) {

                entry.parentNode.removeChild(entry);

            }

        } catch (error) {}

        prayerPageEl = null;

        prayerListEl = null;

        console.log("Prayer Journal shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            total: prayers.length

        };

    }

});
