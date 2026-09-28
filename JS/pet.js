/*======================================
        AEGIS COMPANION PET v1.0.0
======================================

    A floating desktop companion for AEGIS.

    SETUP:
    1. Save this file as JS/pet.js
    2. Add <script src="JS/pet.js"></script> after core.js
    3. Drop the sprite sheets into assets/pet/ as:
         orb-idle.webp     (4 frames)
         orb-happy.webp    (4 frames)
         orb-sleep.webp    (3 frames)
         orb-excited.webp  (4 frames)

    DRIVING THE PET:
    - Aegis.run("pet", "setMood", "happy")
    - Aegis.broadcast("petMood", { mood: "excited", duration: 4000 })
    - The pet broadcasts "petClicked" when tapped.

    LATER (real desktop pet):
    This same module runs inside an Electron transparent,
    always-on-top window. No code changes needed here.

======================================*/


const PET_SPRITES = {

    idle: {
        src: "assets/pet/orb-idle.webp",
        frames: 4,
        fps: 6
    },

    happy: {
        src: "assets/pet/orb-happy.webp",
        frames: 4,
        fps: 10
    },

    sleep: {
        src: "assets/pet/orb-sleep.webp",
        frames: 3,
        fps: 2
    },

    excited: {
        src: "assets/pet/orb-excited.webp",
        frames: 4,
        fps: 12
    }

};


const PET_SIZE = 128;

const PET_POS_KEY = "aegisPetPos";


let petEl = null;

let petStrip = null;

let petImg = null;

let petMood = "idle";

let petFrame = 0;

let petTimer = null;

let petRevertTimer = null;

let petListeners = [];


function petSprite(mood) {

    return PET_SPRITES[mood] || PET_SPRITES.idle;

}


function petDrawFrame() {

    if (!petStrip) return;

    petStrip.style.transform =
        `translateX(${-petFrame * PET_SIZE}px)`;

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


function petApplyMood(mood) {

    const sprite = petSprite(mood);

    petMood = mood;

    petFrame = 0;

    petImg.src = sprite.src;

    petStrip.style.width =
        `${sprite.frames * PET_SIZE}px`;

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

    if (petRevertTimer) {

        clearTimeout(petRevertTimer);

        petRevertTimer = null;

    }

    petApplyMood(mood);

    if (durationMs > 0 && mood !== "idle" && mood !== "sleep") {

        petRevertTimer = setTimeout(() => {

            petApplyMood("idle");

            petRevertTimer = null;

        }, durationMs);

    }

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

    const maxX = window.innerWidth - PET_SIZE;

    const maxY = window.innerHeight - PET_SIZE;

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

        width: `${PET_SIZE}px`,

        height: `${PET_SIZE}px`,

        overflow: "hidden",

        zIndex: "9999",

        cursor: "grab",

        touchAction: "none",

        userSelect: "none",

        filter: "drop-shadow(0 0 18px rgba(70, 200, 255, 0.45))"

    });

    petStrip = document.createElement("div");

    petStrip.style.display = "flex";

    petStrip.style.height = "100%";

    petStrip.style.willChange = "transform";

    petImg = document.createElement("img");

    petImg.alt = "AEGIS companion";

    petImg.draggable = false;

    Object.assign(petImg.style, {

        height: `${PET_SIZE}px`,

        width: "auto",

        pointerEvents: "none"

    });

    petStrip.appendChild(petImg);

    petEl.appendChild(petStrip);

    document.body.appendChild(petEl);

    const saved = petLoadPos();

    if (saved) {

        petPlace(saved.x, saved.y);

    } else {

        petPlace(
            window.innerWidth - PET_SIZE - 24,
            window.innerHeight - PET_SIZE - 24
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

    petListeners.forEach((unsub) => {

        try { unsub(); } catch (error) {}

    });

    petListeners = [];

    if (petEl && petEl.parentNode) {

        petEl.parentNode.removeChild(petEl);

    }

    petEl = null;

    petStrip = null;

    petImg = null;

}


Aegis.register("pet", {

    version: "1.0.0",


    setMood,


    getMood() {

        return petMood;

    },


    init() {

        petBuild();

        petApplyMood("idle");

        petListeners.push(
            Aegis.listen("petMood", (data) => {

                if (!data || !data.mood) return;

                setMood(data.mood, data.duration || 0);

            })
        );

        console.log("Pet initialized.");

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

            mood: petMood

        };

    }

});
