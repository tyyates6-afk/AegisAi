/*======================================

        AEGIS FOCUS SOUNDS v0.1.0

        STAND-IN module (unpolished). Generates ambient sound
        with the Web Audio API — no audio files needed:

            🌧 RAIN   brown noise through a lowpass filter
            📻 STATIC soft white noise

        Auto-starts when a focus session begins and stops
        when it ends (if a sound is selected). Choice and
        volume persist in localStorage ("aegisFocusSounds").

        Page lives in the More hub, like Prayer Journal.

======================================*/


const FS_PAGE = "focussounds";

const FS_STORE_KEY = "aegisFocusSounds";

const FS_PLAYLISTS = [
    { id: "spotify", name: "Spotify", host: "open.spotify.com",
        path: /^\/(?:intl-[a-z]{2}\/)?playlist\/[a-z0-9]+\/?$/i },
    { id: "appleMusic", name: "Apple Music", host: "music.apple.com",
        path: /^\/(?:[a-z]{2}\/)?playlist\/(?:[^/]+\/)?pl\.[a-z0-9-]+\/?$/i }
];
let fsPlaylistLinks = {};


let fsPageEl = null;

let fsBtns = {};

let fsVolEl = null;

let fsCtx = null;

let fsNodes = null;

let fsChoice = "off";

let fsVolume = 0.5;


/* ---------- data ---------- */


function fsLoad() {

    try {

        const raw = localStorage.getItem(FS_STORE_KEY);

        if (!raw) return;

        const data = JSON.parse(raw);
        fsPlaylistLinks = Object.fromEntries(FS_PLAYLISTS.map(provider => [
            provider.id, fsPlaylistUrl(provider, data?.playlists?.[provider.id])
        ]));

        if (data && typeof data.sound === "string") {

            fsChoice = data.sound;

        }

        if (data && typeof data.volume === "number") {

            fsVolume = Math.min(1, Math.max(0, data.volume));

        }

    } catch (error) {}

}


function fsSave() {

    try {

        localStorage.setItem(FS_STORE_KEY, JSON.stringify({

            sound: fsChoice,

            volume: fsVolume,
            playlists: fsPlaylistLinks

        }));

        return true;
    } catch (error) {
        return false;
    }

}

function fsPlaylistUrl(provider, value) {
    if (typeof value !== "string") return "";
    try {
        const url = new URL(value.trim());
        if (url.protocol === "https:" && url.host === provider.host &&
            !url.username && !url.password && provider.path.test(url.pathname)) {
            return url.origin + url.pathname;
        }
    } catch {
        // The field may be empty or contain an incomplete URL.
    }
    return "";
}


/* ---------- audio ---------- */


function fsEnsureCtx() {

    if (fsCtx) return fsCtx;

    const Ctor = window.AudioContext ||
        window.webkitAudioContext;

    if (!Ctor) return null;

    fsCtx = new Ctor();

    return fsCtx;

}


function fsNoiseBuffer(ctx, brown) {

    const len = ctx.sampleRate * 2;

    const buf = ctx.createBuffer(1, len, ctx.sampleRate);

    const data = buf.getChannelData(0);

    let last = 0;

    for (let i = 0; i < len; i++) {

        const white = Math.random() * 2 - 1;

        if (brown) {

            /* Brown-ish noise: leaky integration. */

            last = (last + 0.02 * white) / 1.02;

            data[i] = last * 3.5;

        } else {

            data[i] = white * 0.5;

        }

    }

    return buf;

}


function fsStopAudio() {

    if (!fsNodes) return;

    try {

        fsNodes.src.stop();

    } catch (error) {}

    try {

        fsNodes.src.disconnect();

        fsNodes.filter.disconnect();

        fsNodes.gain.disconnect();

    } catch (error) {}

    fsNodes = null;

}


function fsStartAudio(kind) {

    const ctx = fsEnsureCtx();

    if (!ctx) return false;

    if (ctx.state === "suspended") {

        ctx.resume();

    }

    fsStopAudio();

    const src = ctx.createBufferSource();

    src.buffer = fsNoiseBuffer(ctx, kind === "rain");

    src.loop = true;

    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";

    filter.frequency.value = kind === "rain" ? 900 : 4000;

    const gain = ctx.createGain();

    gain.gain.value = fsVolume * (kind === "rain" ? 0.9 : 0.25);

    src.connect(filter);

    filter.connect(gain);

    gain.connect(ctx.destination);

    src.start();

    fsNodes = { src: src, filter: filter, gain: gain };

    return true;

}


function setSound(kind) {

    fsChoice = kind === "rain" || kind === "static"
        ? kind
        : "off";

    fsSave();

    if (fsChoice === "off") {

        fsStopAudio();

    } else {

        fsStartAudio(fsChoice);

    }

    fsPaint();

    try {

        Aegis.broadcast("focusSoundChanged", {

            sound: fsChoice

        });

    } catch (error) {}

    return fsChoice;

}


function setVolume(v) {

    fsVolume = Math.min(1, Math.max(0, Number(v) || 0));

    fsSave();

    if (fsNodes && fsNodes.gain) {

        fsNodes.gain.gain.value = fsVolume *
            (fsChoice === "rain" ? 0.9 : 0.25);

    }

    return fsVolume;

}


function fsGetStatus() {

    return {

        sound: fsChoice,

        volume: fsVolume,

        playing: !!fsNodes

    };

}


/* ---------- nav glue ---------- */


function fsNav() {

    try {

        if (typeof Aegis !== "undefined" &&
            Aegis.getModule) {

            const mod = Aegis.getModule("navigation");

            if (mod && mod.api) return mod.api;

        }

    } catch (error) {}

    return window.Navigation || null;

}


function fsShowPage(name) {

    const nav = fsNav();

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


function fsGoMore() {

    fsShowPage("more");

}


function fsHookNavigation() {

    const nav = fsNav();

    if (!nav || !fsPageEl) return false;

    try {

        if (nav._els && Array.isArray(nav._els.pages)) {

            if (nav._els.pages.indexOf(fsPageEl) < 0) {

                nav._els.pages.push(fsPageEl);

            }

            return true;

        }

    } catch (error) {}

    return false;

}


function fsAddMoreEntry() {

    try {

        const hubList = document.querySelector(".aegis-more-list");

        if (!hubList) return false;

        if (hubList.querySelector(
            '[data-goto-page="' + FS_PAGE + '"]'
        )) {

            return true;

        }

        const item = document.createElement("button");

        item.className = "aegis-more-item";

        item.setAttribute("data-goto-page", FS_PAGE);

        item.textContent = "🔊 Focus Sounds";

        item.addEventListener("click", fsOpen);

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


function fsStyle(el, styles) {

    try {

        Object.assign(el.style, styles);

    } catch (error) {}

}


/* ---------- page ---------- */


function fsOpen() {

    fsShowPage(FS_PAGE);

}


function fsRefresh() {

    fsPaint();

}


function fsPaint() {

    Object.keys(fsBtns).forEach((kind) => {

        const btn = fsBtns[kind];

        if (!btn) return;

        const active = fsChoice === kind;

        fsStyle(btn, {

            border: "1px solid rgba(80, 210, 255, " +
                (active ? "0.8" : "0.35") + ")",

            background: active
                ? "rgba(80, 210, 255, 0.18)"
                : "transparent"

        });

    });

    if (fsVolEl) fsVolEl.value = fsVolume;

}


function fsSoundBtn(kind, label) {

    const btn = document.createElement("button");

    btn.textContent = label;

    fsStyle(btn, {

        borderRadius: "999px",

        border: "1px solid rgba(80, 210, 255, 0.35)",

        background: "transparent",

        color: "#9fdcff",

        padding: "8px 14px",

        fontSize: "12px",

        cursor: "pointer",

        width: "auto"

    });

    btn.addEventListener("click", () => setSound(kind));

    fsBtns[kind] = btn;

    return btn;

}


function fsBuildPlaylists(card) {
    const section = document.createElement("section");
    section.className = "focus-playlists";
    const heading = document.createElement("h3");
    heading.textContent = "Focus playlists";
    section.appendChild(heading);

    for (const provider of FS_PLAYLISTS) {
        const form = document.createElement("form");
        form.noValidate = true;
        form.className = "focus-playlist";

        const label = document.createElement("label");
        label.htmlFor = `focus-playlist-${provider.id}`;
        label.textContent = `${provider.name} playlist link`;
        const input = document.createElement("input");
        input.id = label.htmlFor;
        input.type = "url";
        input.autocomplete = "off";
        input.value = fsPlaylistLinks[provider.id] || "";

        const actions = document.createElement("div");
        actions.className = "focus-playlist-actions";
        const save = document.createElement("button");
        save.type = "submit";
        save.textContent = "Save link";
        const open = document.createElement("a");
        open.textContent = `Open in ${provider.name}`;
        open.target = "_blank";
        open.rel = "noopener noreferrer";
        const updateLink = () => {
            const url = fsPlaylistLinks[provider.id];
            open.hidden = !url;
            if (url) open.href = url;
            else open.removeAttribute("href");
        };
        updateLink();
        actions.append(save, open);

        const status = document.createElement("div");
        status.id = `${input.id}-status`;
        status.setAttribute("role", "status");
        input.setAttribute("aria-describedby", status.id);
        input.addEventListener("input", () => {
            input.removeAttribute("aria-invalid");
            status.textContent = "";
        });
        form.addEventListener("submit", event => {
            event.preventDefault();
            const url = fsPlaylistUrl(provider, input.value);
            if (!url && input.value.trim()) {
                input.setAttribute("aria-invalid", "true");
                status.textContent = `Paste a playlist link from ${provider.name}.`;
                input.focus();
                return;
            }
            const previous = fsPlaylistLinks[provider.id] || "";
            fsPlaylistLinks[provider.id] = url;
            if (!fsSave()) {
                fsPlaylistLinks[provider.id] = previous;
                status.textContent = "Could not save the link on this device.";
                return;
            }
            input.value = url;
            updateLink();
            status.textContent = url ? "Playlist link saved." : "Playlist link cleared.";
        });
        form.append(label, input, actions, status);
        section.appendChild(form);
    }
    card.appendChild(section);
}


function fsBuildPage() {

    fsPageEl = document.createElement("div");

    fsPageEl.className = "aegis-page";

    fsPageEl.dataset.page = FS_PAGE;

    /* Constrain the page to the dashboard's centered column
       instead of stretching full-bleed edge to edge. */

    fsStyle(fsPageEl, {

        width: "min(1200px, 92%)",

        margin: "0 auto"

    });

    const back = document.createElement("button");

    back.className = "aegis-page-back";

    back.setAttribute("data-back-to", "more");

    back.textContent = "← Back to More";

    back.addEventListener("click", fsGoMore);

    fsPageEl.appendChild(back);

    const card = document.createElement("section");

    card.className = "card";

    const h2 = document.createElement("h2");

    h2.textContent = "🔊 Focus Sounds";

    card.appendChild(h2);

    const row = document.createElement("div");

    fsStyle(row, {

        display: "flex",

        gap: "8px",

        marginBottom: "12px",

        flexWrap: "wrap"

    });

    row.appendChild(fsSoundBtn("rain", "🌧 RAIN"));

    row.appendChild(fsSoundBtn("static", "📻 STATIC"));

    row.appendChild(fsSoundBtn("off", "🔇 OFF"));

    card.appendChild(row);

    const volLabel = document.createElement("div");

    volLabel.textContent = "Volume";

    fsStyle(volLabel, {

        fontSize: "11px",

        color: "rgba(159, 220, 255, 0.6)",

        marginBottom: "4px"

    });

    card.appendChild(volLabel);

    fsVolEl = document.createElement("input");

    fsVolEl.type = "range";

    fsVolEl.min = "0";

    fsVolEl.max = "1";

    fsVolEl.step = "0.05";

    fsVolEl.value = fsVolume;

    fsStyle(fsVolEl, { width: "100%" });

    fsVolEl.addEventListener("input", () => {

        setVolume(parseFloat(fsVolEl.value));

    });

    card.appendChild(fsVolEl);

    const note = document.createElement("div");

    note.textContent =
        "Auto-starts with focus sessions when a sound is picked.";

    fsStyle(note, {

        fontSize: "11px",

        color: "rgba(159, 220, 255, 0.55)",

        marginTop: "10px"

    });

    card.appendChild(note);
    fsBuildPlaylists(card);

    fsPageEl.appendChild(card);

    document.body.appendChild(fsPageEl);

}


const fsUnsubs = [];


Aegis.register("focussounds", {

    version: "0.1.0",

    name: "Focus Sounds (stand-in)",


    setSound,

    setVolume,

    getStatus: fsGetStatus,

    open: fsOpen,

    refresh: fsRefresh,


    init() {

        fsLoad();

        fsBuildPage();

        fsAddMoreEntry();

        fsPaint();

        if (!fsHookNavigation()) {

            let attempts = 0;

            const retry = setInterval(() => {

                attempts += 1;

                if (fsHookNavigation() || attempts >= 20) {

                    clearInterval(retry);

                }

            }, 250);

        }

        try {

            fsUnsubs.push(Aegis.listen("focusStarted", () => {

                if (fsChoice !== "off") {

                    fsStartAudio(fsChoice);

                }

            }));

            fsUnsubs.push(Aegis.listen("focusEnded", () => {

                fsStopAudio();

            }));

        } catch (error) {}

        console.log("Focus Sounds (stand-in) initialized.");

    },


    fsRefresh() {

        fsRefresh();

    },


    shutdown() {

        fsStopAudio();

        fsUnsubs.forEach((unsub) => {

            try {

                unsub();

            } catch (error) {}

        });

        fsUnsubs.length = 0;

        if (fsPageEl && fsPageEl.parentNode) {

            fsPageEl.parentNode.removeChild(fsPageEl);

        }

        try {

            const entry = document.querySelector(
                '.aegis-more-list [data-goto-page="' +
                FS_PAGE + '"]'
            );

            if (entry && entry.parentNode) {

                entry.parentNode.removeChild(entry);

            }

        } catch (error) {}

        fsPageEl = null;

        console.log("Focus Sounds (stand-in) shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            sound: fsChoice,

            playing: !!fsNodes

        };

    }

});
