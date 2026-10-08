/*======================================

        AEGIS VOICE COMMANDS v0.1.0

        STAND-IN module (unpolished). Uses the browser's
        built-in Web Speech API (no keys, no backend) to hear
        a command and map it to an Aegis action:

            "focus 25"      start a 25-min focus session
            "stop focus"    end the focus session
            "timer 5"       start a 5-min timer
            "go to planner" open the Planner page
            "go to prayer"  open Prayer Journal
            ...etc.

        Tap LISTEN, speak, watch it work. Chrome/Edge only
        for now (SpeechRecognition support).

        Page lives in the More hub, like Prayer Journal.

======================================*/


const VOICECMD_PAGE = "voicecommands";


let vcPageEl = null;

let vcLogEl = null;

let vcListenBtn = null;

let vcRecog = null;

let vcListening = false;


/* ---------- speech ---------- */


function vcSupported() {

    try {

        return !!(window.SpeechRecognition ||
            window.webkitSpeechRecognition);

    } catch (error) {

        return false;

    }

}


function vcLog(heard, did) {

    if (!vcLogEl) return;

    const row = document.createElement("div");

    vcStyle(row, {

        fontSize: "12px",

        color: "#9fdcff",

        padding: "6px 0",

        borderBottom: "1px solid rgba(80, 210, 255, 0.12)"

    });

    const h = document.createElement("div");

    h.textContent = '🎤 "' + heard + '"';

    const d = document.createElement("div");

    d.textContent = "→ " + did;

    vcStyle(d, {

        color: "rgba(159, 220, 255, 0.65)",

        marginTop: "2px"

    });

    row.appendChild(h);

    row.appendChild(d);

    vcLogEl.insertBefore(row, vcLogEl.firstChild);

    while (vcLogEl.children.length > 8) {

        vcLogEl.removeChild(vcLogEl.lastChild);

    }

}


function vcNav() {

    try {

        if (typeof Aegis !== "undefined" &&
            Aegis.getModule) {

            const mod = Aegis.getModule("navigation");

            if (mod && mod.api) return mod.api;

        }

    } catch (error) {}

    return null;

}


function vcGoPage(name) {

    const nav = vcNav();

    if (nav && typeof nav.showPage === "function") {

        nav.showPage(name);

        return true;

    }

    return false;

}


/* Map a transcript to an action. Returns a description of
   what it did (or why it did nothing). */

function handleCommand(raw) {

    const text = String(raw || "").toLowerCase().trim();

    if (!text) return "heard nothing — try again";

    let m;

    /* "focus 25" or "start focus 25" */

    m = text.match(/(?:start\s+)?focus\s+(\d+)/);

    if (m) {

        const mins = Math.max(1, parseInt(m[1], 10) || 25);

        try {

            Aegis.run("focus", "start", mins, "voice");

            return "started a " + mins + "-minute focus session";

        } catch (error) {

            return "couldn't start focus";

        }

    }

    if (/stop.*focus|end.*focus/.test(text)) {

        try {

            Aegis.run("focus", "stop");

            return "stopped the focus session";

        } catch (error) {

            return "no focus session to stop";

        }

    }

    if (/\bfocus\b/.test(text)) {

        try {

            Aegis.run("focus", "start", 25, "voice");

            return "started a 25-minute focus session";

        } catch (error) {

            return "couldn't start focus";

        }

    }

    /* "timer 5" (minutes) */

    m = text.match(/timer\s+(\d+)/);

    if (m) {

        const mins = Math.max(1, parseInt(m[1], 10) || 5);

        try {

            Aegis.run("timer", "start", mins * 60, "voice");

            return "started a " + mins + "-minute timer";

        } catch (error) {

            return "couldn't start the timer";

        }

    }

    /* page navigation */

    const pages = ["planner", "prayer", "settings",
        "home", "more", "modules", "command"];

    for (let i = 0; i < pages.length; i++) {

        if (text.indexOf(pages[i]) >= 0) {

            if (vcGoPage(pages[i])) {

                return "opened " + pages[i];

            }

            return "couldn't open " + pages[i];

        }

    }

    if (/what.*time|time is it/.test(text)) {

        const now = new Date();

        const spoken = now.toLocaleTimeString([], {

            hour: "numeric",

            minute: "2-digit"

        });

        try {

            Aegis.run("voice", "speak",
                "It is " + spoken);

        } catch (error) {}

        return "it's " + spoken;

    }

    return "didn't recognize a command in that";

}


function toggleListen() {

    if (vcListening) {

        vcStop();

        return;

    }

    if (!vcSupported()) {

        vcLog("(no mic)", "speech recognition isn't " +
            "supported in this browser — try Chrome or Edge");

        return;

    }

    try {

        const Ctor = window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        vcRecog = new Ctor();

        vcRecog.lang = "en-US";

        vcRecog.interimResults = false;

        vcRecog.maxAlternatives = 1;

        vcRecog.onresult = (event) => {

            const heard = event.results[0][0].transcript;

            const did = handleCommand(heard);

            vcLog(heard, did);

        };

        vcRecog.onerror = (event) => {

            vcLog("(mic error)",
                "recognition error: " + (event.error || "?"));

            vcStop();

        };

        vcRecog.onend = () => {

            vcStop();

        };

        vcRecog.start();

        vcListening = true;

        vcPaintBtn();

    } catch (error) {

        vcLog("(mic error)", "couldn't start the microphone");

    }

}


function vcStop() {

    vcListening = false;

    try {

        if (vcRecog) vcRecog.stop();

    } catch (error) {}

    vcRecog = null;

    vcPaintBtn();

}


function vcPaintBtn() {

    if (!vcListenBtn) return;

    vcListenBtn.textContent = vcListening
        ? "⏹ STOP LISTENING"
        : "🎤 LISTEN";

    vcStyle(vcListenBtn, {

        background: vcListening
            ? "rgba(255, 120, 120, 0.15)"
            : "rgba(80, 210, 255, 0.12)"

    });

}


/* ---------- nav glue ---------- */


function vcShowPage(name) {

    const nav = vcNav();

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


function vcGoMore() {

    vcShowPage("more");

}


function vcHookNavigation() {

    const nav = vcNav();

    if (!nav || !vcPageEl) return false;

    try {

        if (nav._els && Array.isArray(nav._els.pages)) {

            if (nav._els.pages.indexOf(vcPageEl) < 0) {

                nav._els.pages.push(vcPageEl);

            }

            return true;

        }

    } catch (error) {}

    return false;

}


function vcAddMoreEntry() {

    try {

        const hubList = document.querySelector(".aegis-more-list");

        if (!hubList) return false;

        if (hubList.querySelector(
            '[data-goto-page="' + VOICECMD_PAGE + '"]'
        )) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", VOICECMD_PAGE);

        item.textContent = "🎤 Voice Commands";

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


function vcStyle(el, styles) {

    try {

        Object.assign(el.style, styles);

    } catch (error) {}

}


/* ---------- page ---------- */


function open() {

    vcShowPage(VOICECMD_PAGE);

}


function refresh() {}


function vcBuildPage() {

    vcPageEl = document.createElement("div");

    vcPageEl.className = "aegis-page";

    vcPageEl.dataset.page = VOICECMD_PAGE;

    const back = document.createElement("button");

    back.className = "aegis-page-back";

    back.setAttribute("data-back-to", "more");

    back.textContent = "← Back to More";

    back.addEventListener("click", vcGoMore);

    vcPageEl.appendChild(back);

    const card = document.createElement("section");

    card.className = "card";

    const h2 = document.createElement("h2");

    h2.textContent = "🎤 Voice Commands";

    card.appendChild(h2);

    const hint = document.createElement("div");

    hint.textContent = vcSupported()
        ? 'Try: "focus 25" · "timer 5" · "go to planner" · "stop focus"'
        : "Speech recognition isn't supported in this browser.";

    vcStyle(hint, {

        fontSize: "11px",

        color: "rgba(159, 220, 255, 0.6)",

        marginBottom: "10px"

    });

    card.appendChild(hint);

    vcListenBtn = document.createElement("button");

    vcListenBtn.textContent = "🎤 LISTEN";

    vcStyle(vcListenBtn, {

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.5)",

        background: "rgba(80, 210, 255, 0.12)",

        color: "#9fdcff",

        padding: "10px 18px",

        fontSize: "13px",

        letterSpacing: "1px",

        cursor: "pointer",

        width: "auto",

        marginBottom: "12px"

    });

    vcListenBtn.addEventListener("click", toggleListen);

    card.appendChild(vcListenBtn);

    vcLogEl = document.createElement("div");

    card.appendChild(vcLogEl);

    vcPageEl.appendChild(card);

    document.body.appendChild(vcPageEl);

}


Aegis.register("voicecmd", {

    version: "0.1.0",

    name: "Voice Commands (stand-in)",


    handleCommand,

    toggleListen,

    supported: vcSupported,

    open,

    refresh,


    init() {

        vcBuildPage();

        vcAddMoreEntry();

        if (!vcHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (vcHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        console.log("Voice Commands (stand-in) initialized.");

    },


    refresh() {

        refresh();

    },


    shutdown() {

        vcStop();

        if (vcPageEl && vcPageEl.parentNode) {

            vcPageEl.parentNode.removeChild(vcPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="' +
                VOICECMD_PAGE + '"]'
            );

            if (entry && entry.parentNode) {

                entry.parentNode.removeChild(entry);

            }

        } catch (error) {}

        vcPageEl = null;

        console.log("Voice Commands (stand-in) shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            supported: vcSupported(),

            listening: vcListening

        };

    }

});
