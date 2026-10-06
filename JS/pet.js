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
         orb-sleep-night.png (4 frames — breathing, cozy nighttime look)
         orb-excited.png   (4 frames)
         orb-hungry.png    (3 frames — grumble shiver)
       (Transparent PNGs — backgrounds already keyed out.)

    DRIVING THE PET:
    - Aegis.run("pet", "setMood", "happy")
    - Aegis.broadcast("petMood", { mood: "excited", duration: 4000 })
    - The pet broadcasts "petClicked" when tapped.

    FEEDING:
    - POTATO gets hungry after 6h without food (configurable).
    - A 🍪 button floats at his top-right, pulsing when hungry.
    - Aegis.run("pet", "feed") — drops a random snack, happy wiggle.
    - Aegis.run("pet", "setHungerHours", n)
    - Aegis.run("pet", "checkHunger")
    - Broadcasts: petHungry, petFed { food, wasHungry }
    - Hunger waits while he sleeps or focuses; midnight snacks
      don't wake him.

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
        frames: 4,
        fps: 2
    },

    /* Hungry: droopy side-eye + tummy growl. Frames shiver. */

    hungry: {
        src: "assets/pet/orb-hungry.png",
        frames: 3,
        fps: 4
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


/* Night-sleep life: floating Zzz overlay.
   (The breathing itself is baked into the sprite frames.) */

let petZzz = null;

let petCssInjected = false;


/* ---- Hunger & feeding ---- */

let petLastFed = 0;

let petHungry = false;

let petHungerMs = 6 * 3600 * 1000; /* hungry after 6 hours */

let petHungerTimer = null;

let petFeedBtn = null;

const PET_FED_KEY = "aegisPetLastFed";

const PET_FOODS = ["🍪", "🍎", "🍩", "🍕", "🧁"];

const PET_HUNGER_CHECK_MS = 5 * 60 * 1000; /* check every 5 minutes */


const PET_CSS = `
#aegis-pet-zzz {
    position: absolute;
    right: 26px;
    top: 8px;
    width: 44px;
    height: 66px;
    pointer-events: none;
    display: none;
}
#aegis-pet-zzz.on { display: block; }
#aegis-pet-zzz span {
    position: absolute;
    left: 0;
    bottom: 0;
    font-size: 20px;
    line-height: 1;
    color: #aef1ff;
    text-shadow: 0 0 10px rgba(140, 220, 255, 0.95);
    opacity: 0;
    animation: aegis-pet-zzz-float 3.4s ease-in infinite;
}
#aegis-pet-zzz span:nth-child(2) { animation-delay: 1.13s; font-size: 24px; }
#aegis-pet-zzz span:nth-child(3) { animation-delay: 2.26s; font-size: 28px; }
@keyframes aegis-pet-zzz-float {
    0% { opacity: 0; transform: translate(0, 0) scale(0.7); }
    20% { opacity: 1; }
    100% { opacity: 0; transform: translate(14px, -58px) scale(1.2); }
}
@keyframes aegis-pet-food-drop {
    0% { opacity: 0; transform: translateY(-16px) scale(0.6); }
    25% { opacity: 1; transform: translateY(0) scale(1.1); }
    70% { opacity: 1; transform: translateY(48px) scale(1); }
    100% { opacity: 0; transform: translateY(66px) scale(0.7); }
}
.aegis-pet-food {
    position: fixed;
    font-size: 34px;
    line-height: 1;
    pointer-events: none;
    z-index: 10001;
    animation: aegis-pet-food-drop 1.3s ease-in forwards;
}
@keyframes aegis-pet-feed-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}
#aegis-pet-feed.hungry {
    animation: aegis-pet-feed-pulse 1s ease-in-out infinite;
    opacity: 1 !important;
    border-color: #ffb347 !important;
}
`;


function petInjectCss() {

    if (petCssInjected) return;

    petCssInjected = true;

    const style = document.createElement("style");

    style.textContent = PET_CSS;

    (document.head || document.body).appendChild(style);

}


function petLoadFed() {

    try {

        const saved = parseInt(localStorage.getItem(PET_FED_KEY) || "0", 10);

        petLastFed = saved > 0 ? saved : Date.now();

    } catch (error) {

        petLastFed = Date.now();

    }

}


function petSaveFed() {

    try {

        localStorage.setItem(PET_FED_KEY, String(petLastFed));

    } catch (error) {}

}


function petFocusActive() {

    try {

        return !!(
            Aegis.modules.focus &&
            Aegis.run("focus", "getStatus").active
        );

    } catch (error) {

        return false;

    }

}


function petCheckHunger() {

    if (!petEl) return;

    if (Date.now() - petLastFed < petHungerMs) return;

    /* Let him sleep and focus in peace — hunger waits. */

    if (petMood === "sleep" || petMood === "sleepNight") return;

    if (petFocusActive()) return;

    if (petMood === "hungry") return;

    const firstTime = !petHungry;

    petHungry = true;

    setMood("hungry");

    if (petFeedBtn) {

        petFeedBtn.classList.add("hungry");

    }

    if (firstTime) {

        Aegis.broadcast("petHungry", {});

        console.log("Pet: POTATO is hungry!");

    }

}


function petFoodDrop(food) {

    const x = petEl.offsetLeft + petFrameW / 2;

    const y = petEl.offsetTop;

    const el = document.createElement("div");

    el.className = "aegis-pet-food";

    el.textContent = food;

    el.style.left = `${x - 17}px`;

    el.style.top = `${y - 56}px`;

    document.body.appendChild(el);

    setTimeout(() => {

        if (el.parentNode) {

            el.parentNode.removeChild(el);

        }

    }, 1400);

}


function feed() {

    if (!petEl) {

        console.warn("Pet: feed called before init.");

        return;

    }

    petLastFed = Date.now();

    petSaveFed();

    const wasHungry = petHungry;

    petHungry = false;

    if (petFeedBtn) {

        petFeedBtn.classList.remove("hungry");

    }

    const food =
        PET_FOODS[Math.floor(Math.random() * PET_FOODS.length)];

    petFoodDrop(food);

    if (petMood === "sleep" || petMood === "sleepNight") {

        /* Midnight snack — hunger cleared, let him sleep. */

    } else {

        setMood("idle");

        setMood("happy", 2500);

    }

    Aegis.broadcast("petFed", { food, wasHungry });

    console.log(`Pet: POTATO fed ${food}`);

}


function petPlaceFeedBtn() {

    if (!petFeedBtn || !petEl) return;

    petFeedBtn.style.left =
        `${petEl.offsetLeft + petFrameW - 4}px`;

    petFeedBtn.style.top =
        `${petEl.offsetTop - 18}px`;

}

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

    /* Night-sleep life: floating Zzz overlay. */

    const snoring = mood === "sleepNight";

    if (petZzz) {

        petZzz.classList.toggle("on", snoring);

    }

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

    petPlaceFeedBtn();

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

    petInjectCss();

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

    /* Floating Zzz overlay, shown only for the night-sleep mood. */

    petZzz = document.createElement("div");

    petZzz.id = "aegis-pet-zzz";

    petZzz.innerHTML = "<span>z</span><span>z</span><span>z</span>";

    petEl.appendChild(petZzz);

    /* Feed button — floats at his top-right, follows him around. */

    petFeedBtn = document.createElement("button");

    petFeedBtn.id = "aegis-pet-feed";

    petFeedBtn.textContent = "🍪";

    petFeedBtn.title = "Feed POTATO";

    Object.assign(petFeedBtn.style, {

        position: "fixed",

        zIndex: "10000",

        width: "38px",

        height: "38px",

        borderRadius: "50%",

        border: "2px solid rgba(140, 220, 255, 0.5)",

        background: "rgba(10, 25, 45, 0.85)",

        fontSize: "20px",

        lineHeight: "1",

        cursor: "pointer",

        opacity: "0.65",

        padding: "0"

    });

    petFeedBtn.addEventListener("click", () => feed());

    document.body.appendChild(petFeedBtn);

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

    if (petHungerTimer) {

        clearInterval(petHungerTimer);

        petHungerTimer = null;

    }

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

    petZzz = null;

    if (petFeedBtn && petFeedBtn.parentNode) {

        petFeedBtn.parentNode.removeChild(petFeedBtn);

    }

    petFeedBtn = null;

    petHungry = false;

}


Aegis.register("pet", {

    version: "1.0.0",


    setMood,


    feed,


    checkHunger() {

        petCheckHunger();

    },


    setHungerHours(hours) {

        petHungerMs = Math.max(0.001, hours) * 3600 * 1000;

    },


    getMood() {

        return petMood;

    },


    init() {

        if (petEl) {

            return;

        }

        petLoadFed();

        petBuild();

        petShowMood("idle");

        petCheckHunger();

        petHungerTimer = setInterval(
            petCheckHunger,
            PET_HUNGER_CHECK_MS
        );

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

            linked: petLinked,

            hungry: petHungry,

            lastFed: petLastFed,

            hungerHours: petHungerMs / 3600000

        };

    }

});
