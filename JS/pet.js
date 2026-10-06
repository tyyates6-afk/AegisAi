/*======================================
        AEGIS COMPANION PET v1.0.0
======================================

    A floating desktop companion for AEGIS.

    SETUP:
    1. Save this file as JS/pet.js
    2. Add <script src="JS/pet.js"></script> after core.js
    3. Drop the sprite sheets into assets/pet/ as:
         orb-idle.png      (4 frames)
         orb-happy.png     (4 frames)
         orb-sleep.png     (3 frames)
         orb-sleep-night.png (1 frame — cozy nighttime look)
         orb-excited.png   (4 frames)
       (Transparent PNGs — backgrounds already keyed out.)

    DRIVING THE PET:
    - Aegis.run("pet", "setMood", "happy")
    - Aegis.broadcast("petMood", { mood: "excited", duration: 4000 })
    - The pet broadcasts "petClicked" when tapped.

    LINKING THE TWO PETS:
    The desktop app hosts a local WebSocket server
    (127.0.0.1:17373). This module connects to it, so the
    dashboard pet and the desktop pet mirror each other's
    moods. Nothing leaves your PC. If the desktop app
    isn't running, the dashboard pet just works solo.

======================================*/


const PET_SPRITES = {

    idle: {
        src: "assets/pet/orb-idle.png",
        frames: 4,
        fps: 6
    },

    happy: {
        src: "assets/pet/orb-happy.png",
        frames: 4,
        fps: 10
    },

    sleep: {
        src: "assets/pet/orb-sleep.png",
        frames: 3,
        fps: 2
    },

    /* Cozy nighttime look: pillow, blanket, nightcap. Used by
       routines at night; focus naps use the plain "sleep". */

    sleepNight: {
        src: "assets/pet/orb-sleep-night.png",
        frames: 1,
        fps: 2
    },

    excited: {
        src: "assets/pet/orb-excited.png",
        frames: 4,
        fps: 12
    }

};


const PET_HEIGHT = 128;

const PET_POS_KEY = "aegisPetPos";


/* Links the dashboard pet and the desktop pet.
   The desktop app hosts a WebSocket server on localhost;
   this module connects to it. Everything is local-only.
   If the desktop app isn't running, this fails silently
   and retries quietly in the background. */

const PET_LINK_URL = "ws://127.0.0.1:17373";

const PET_LINK_ID =
    "pet-" + Math.random().toString(36).slice(2, 10);

let petSocket = null;

let petLinked = false;

let petApplyingRemote = false;


function petLinkSend(mood, durationMs) {

    if (!petLinked || !petSocket) return;

    if (petSocket.readyState !== 1) return;

    try {

        petSocket.send(JSON.stringify({

            from: PET_LINK_ID,

            mood: mood,

            duration: durationMs || 0

        }));

    } catch (error) {}

}


function petLinkRetry() {

    setTimeout(() => {

        petSocket = null;

        petLinkConnect();

    }, 10000);

}


function petLinkConnect() {

    if (petSocket) return;

    if (typeof WebSocket === "undefined") return;

    let socket = null;

    try {

        socket = new WebSocket(PET_LINK_URL);

    } catch (error) {

        petLinkRetry();

        return;

    }

    socket.onopen = () => {

        petSocket = socket;

        petLinked = true;

        Aegis.broadcast("petLinked", { id: PET_LINK_ID });

    };

    socket.onmessage = (event) => {

        let data = null;

        try {

            data = JSON.parse(event.data);

        } catch (error) {

            return;

        }

        if (!data || !data.mood) return;

        if (data.from === PET_LINK_ID) return;

        petApplyingRemote = true;

        setMood(data.mood, data.duration || 0);

        petApplyingRemote = false;

    };

    const drop = () => {

        if (socket.__petDead) return;

        socket.__petDead = true;

        petLinked = false;

        if (petSocket === socket) petSocket = null;

        try { socket.close(); } catch (error) {}

        petLinkRetry();

    };

    socket.onclose = drop;

    socket.onerror = drop;

}


let petEl = null;

let petStrip = null;

let petMood = "idle";

/* The mood the pet returns to when a timed mood (like the
   happy flash when you click him) expires. This is what
   keeps him asleep through focus mode. */

let petBaseMood = "idle";

let petFrame = 0;

let petFrameW = PET_HEIGHT;

let petTimer = null;

let petRevertTimer = null;

let petListeners = [];

let petPreloaded = {};


function petSprite(mood) {

    return PET_SPRITES[mood] || PET_SPRITES.idle;

}


/* Measure one frame from the real image so the window
   always shows exactly one frame, whatever the sheet size. */

function petMeasure(mood) {

    const sprite = petSprite(mood);

    const img = petPreloaded[mood];

    if (img && img.naturalWidth > 0) {

        const scale = PET_HEIGHT / img.naturalHeight;

        petFrameW = (img.naturalWidth / sprite.frames) * scale;

    } else {

        petFrameW = PET_HEIGHT;

    }

    petEl.style.width = `${petFrameW}px`;

    petEl.style.height = `${PET_HEIGHT}px`;

}


function petDrawFrame() {

    if (!petStrip) return;

    petStrip.style.transform =
        `translateX(${-petFrame * petFrameW}px)`;

}


function petTick() {

    const sprite = petSprite(petMood);

    petFrame = (petFrame + 1) % sprite.frames;

    petDrawFrame();

}


function petStartLoop() {

    petStopLoop();

    const sprite = petSprite(petMood);

    petTimer = setInterval(
        petTick,
        Math.round(1000 / sprite.fps)
    );

}


function petStopLoop() {

    if (petTimer) {

        clearInterval(petTimer);

        petTimer = null;

    }

}


function petShowMood(mood) {

    const sprite = petSprite(mood);

    petMood = mood;

    petFrame = 0;

    petMeasure(mood);

    petStrip.innerHTML = "";

    const frameImg = petPreloaded[mood];

    if (frameImg) {

        const view = frameImg.cloneNode(false);

        view.style.height = `${PET_HEIGHT}px`;

        view.style.width = "auto";

        view.style.flexShrink = "0";

        view.style.pointerEvents = "none";

        view.draggable = false;

        petStrip.appendChild(view);

    }

    petDrawFrame();

    petStartLoop();

}


function setMood(mood, durationMs = 0) {

    if (!PET_SPRITES[mood]) {

        console.warn(
            `Pet: unknown mood "${mood}".`
        );

        return;

    }

    /* The pet DOM isn't built until init() runs — modules that
       initialize earlier must wait instead of crashing. */

    if (!petEl) {

        console.warn(
            "Pet: setMood called before init, ignoring."
        );

        return;

    }

    if (petRevertTimer) {

        clearTimeout(petRevertTimer);

        petRevertTimer = null;

    }

    petShowMood(mood);

    if (!petApplyingRemote) {

        petLinkSend(mood, durationMs);

    }

    if (durationMs > 0 &&
        mood !== "idle" &&
        mood !== "sleep" &&
        mood !== "sleepNight") {

        /* A timed mood always returns to the pet's base mood
           (e.g. "sleep" during focus mode), not hardcoded
           "idle" — that's the focus-mode bug fix. */

        const revertMood = petBaseMood;

        petRevertTimer = setTimeout(() => {

            petShowMood(revertMood);

            petRevertTimer = null;

        }, durationMs);

    } else {

        /* A persistent mood (no timer) becomes the new base. */

        petBaseMood = mood;

    }

}


function petPreload() {

    Object.keys(PET_SPRITES).forEach((mood) => {

        const img = new Image();

        img.src = PET_SPRITES[mood].src;

        img.onload = () => {

            if (mood === petMood) {

                petMeasure(mood);

                petDrawFrame();

            }

        };

        petPreloaded[mood] = img;

    });

}


function petLoadPos() {

    try {

        const raw = localStorage.getItem(PET_POS_KEY);

        if (!raw) return null;

        return JSON.parse(raw);

    } catch (error) {

        return null;

    }

}


function petSavePos(x, y) {

    try {

        localStorage.setItem(
            PET_POS_KEY,
            JSON.stringify({ x, y })
        );

    } catch (error) {

        /* storage unavailable, pet just won't remember */

    }

}


function petPlace(x, y) {

    const w = petEl.offsetWidth || petFrameW;

    const h = petEl.offsetHeight || PET_HEIGHT;

    const maxX = window.innerWidth - w;

    const maxY = window.innerHeight - h;

    const clampedX = Math.max(0, Math.min(x, maxX));

    const clampedY = Math.max(0, Math.min(y, maxY));

    petEl.style.left = `${clampedX}px`;

    petEl.style.top = `${clampedY}px`;

}


function petMakeDraggable() {

    let dragging = false;

    let moved = false;

    let offsetX = 0;

    let offsetY = 0;

    petEl.addEventListener("pointerdown", (event) => {

        dragging = true;

        moved = false;

        offsetX = event.clientX - petEl.offsetLeft;

        offsetY = event.clientY - petEl.offsetTop;

        petEl.setPointerCapture(event.pointerId);

    });

    petEl.addEventListener("pointermove", (event) => {

        if (!dragging) return;

        moved = true;

        petPlace(
            event.clientX - offsetX,
            event.clientY - offsetY
        );

    });

    petEl.addEventListener("pointerup", (event) => {

        if (!dragging) return;

        dragging = false;

        petSavePos(petEl.offsetLeft, petEl.offsetTop);

        if (!moved) {

            setMood("happy", 2500);

            Aegis.broadcast("petClicked", {
                mood: petMood
            });

        }

    });

}


function petBuild() {

    petEl = document.createElement("div");

    petEl.id = "aegis-pet";

    Object.assign(petEl.style, {

        position: "fixed",

        overflow: "hidden",

        zIndex: "9999",

        cursor: "grab",

        touchAction: "none",

        userSelect: "none",

        filter: "drop-shadow(0 0 14px rgba(80, 210, 255, 0.55))"

    });

    petStrip = document.createElement("div");

    petStrip.style.display = "flex";

    petStrip.style.height = "100%";

    petStrip.style.willChange = "transform";

    petEl.appendChild(petStrip);

    document.body.appendChild(petEl);

    petPreload();

    const saved = petLoadPos();

    if (saved) {

        petPlace(saved.x, saved.y);

    } else {

        petPlace(
            window.innerWidth - petFrameW - 24,
            window.innerHeight - PET_HEIGHT - 24
        );

    }

    petMakeDraggable();

}


function petDestroy() {

    petStopLoop();

    if (petRevertTimer) {

        clearTimeout(petRevertTimer);

        petRevertTimer = null;

    }

    petBaseMood = "idle";

    petListeners.forEach((unsub) => {

        try { unsub(); } catch (error) {}

    });

    petListeners = [];

    if (petEl && petEl.parentNode) {

        petEl.parentNode.removeChild(petEl);

    }

    petEl = null;

    petStrip = null;

}


Aegis.register("pet", {

    version: "1.0.0",


    setMood,


    getMood() {

        return petMood;

    },


    init() {

        if (petEl) {

            return;

        }

        petBuild();

        petShowMood("idle");

        petListeners.push(
            Aegis.listen("petMood", (data) => {

                if (!data || !data.mood) return;

                setMood(data.mood, data.duration || 0);

            })
        );

        console.log("Pet initialized.");

        petLinkConnect();

    },


    refresh() {

        if (petEl) {

            petPlace(petEl.offsetLeft, petEl.offsetTop);

        }

    },


    shutdown() {

        petDestroy();

    },


    status() {

        return {

            online: !!petEl,

            version: this.version,

            mood: petMood,

            linked: petLinked

        };

    }

});
