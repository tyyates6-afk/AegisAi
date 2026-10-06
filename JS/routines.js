/*======================================
        AEGIS ROUTINES v1.0.0
======================================

    POTATO's daily routines: he sleeps at night and wakes up
    on his own in the morning.

    SETUP:
    1. Save this file as JS/routines.js
    2. Add <script src="JS/routines.js"></script> after core.js
       (anywhere after core.js works — it finds the pet and
       focus modules at runtime; after pet.js is tidy)

    USE:
    - Everything is automatic once loaded. Defaults: asleep
      23:00–07:00, checked every minute. Waking up comes with
      a little happy stretch.
    - Aegis.run("routines", "setSleepWindow", 23, 7)
    - Aegis.run("routines", "setEnabled", false)
    - Aegis.run("routines", "sleepNow")
    - Aegis.run("routines", "wakeNow")
    - Aegis.run("routines", "check")      // force a check now
    - Aegis.run("routines", "getStatus")

    BROADCASTS:
    - "routineSleep" {}
    - "routineWake" {}

    Routines never fight focus mode: while a focus session is
    active, the pet's mood belongs to focus.

======================================*/


const ROUTINES_STORE_KEY = "aegisRoutines";

const ROUTINES_CHECK_MS = 60 * 1000;


let routinesEnabled = true;

let routinesSleepStart = 23;

let routinesSleepEnd = 7;

/* True when routines (not focus, not Ty) put him to sleep. */

let routineSleeping = false;

let routinesTimer = null;


function routinesLoad() {

    try {

        const raw = localStorage.getItem(ROUTINES_STORE_KEY);

        if (!raw) return;

        const cfg = JSON.parse(raw);

        if (typeof cfg.enabled === "boolean") {

            routinesEnabled = cfg.enabled;

        }

        if (Number.isInteger(cfg.sleepStart)) {

            routinesSleepStart = cfg.sleepStart;

        }

        if (Number.isInteger(cfg.sleepEnd)) {

            routinesSleepEnd = cfg.sleepEnd;

        }

    } catch (error) {}

}


function routinesSave() {

    try {

        localStorage.setItem(
            ROUTINES_STORE_KEY,
            JSON.stringify({

                enabled: routinesEnabled,

                sleepStart: routinesSleepStart,

                sleepEnd: routinesSleepEnd

            })
        );

    } catch (error) {}

}


function routinesInSleepWindow(hour) {

    if (routinesSleepStart === routinesSleepEnd) return false;

    if (routinesSleepStart < routinesSleepEnd) {

        return hour >= routinesSleepStart && hour < routinesSleepEnd;

    }

    return hour >= routinesSleepStart || hour < routinesSleepEnd;

}


function routinesFocusActive() {

    try {

        return !!(
            Aegis.modules.focus &&
            Aegis.run("focus", "getStatus").active
        );

    } catch (error) {

        return false;

    }

}


function routinesPetMood() {

    try {

        return Aegis.run("pet", "getMood");

    } catch (error) {

        return null;

    }

}


function routinesSetMood(mood, durationMs) {

    try {

        Aegis.run("pet", "setMood", mood, durationMs || 0);

    } catch (error) {}

}


function routinesSleep() {

    routineSleeping = true;

    routinesSetMood("sleep");

    Aegis.broadcast("routineSleep", {});

    console.log("Routines: POTATO is sleeping. Goodnight.");

}


function routinesWake() {

    routineSleeping = false;

    /* Wake up happy: persistent idle first (so idle becomes the
       base mood), then the happy flash settles back to idle. */

    routinesSetMood("idle");

    routinesSetMood("happy", 4000);

    Aegis.broadcast("routineWake", {});

    console.log("Routines: POTATO is awake. Good morning.");

}


function check() {

    if (!routinesEnabled) return;

    /* Focus owns the pet during sessions — never override it. */

    if (routinesFocusActive()) return;

    const hour = new Date().getHours();

    const night = routinesInSleepWindow(hour);

    if (night && !routineSleeping && routinesPetMood() !== "sleep") {

        routinesSleep();

    } else if (!night && routineSleeping) {

        routinesWake();

    }

}


function setSleepWindow(startHour, endHour) {

    const s = Math.max(0, Math.min(23, Math.round(startHour)));

    const e = Math.max(0, Math.min(23, Math.round(endHour)));

    if (isNaN(s) || isNaN(e)) return false;

    routinesSleepStart = s;

    routinesSleepEnd = e;

    routinesSave();

    check();

    return true;

}


function setEnabled(on) {

    routinesEnabled = !!on;

    routinesSave();

    if (!routinesEnabled && routineSleeping) {

        /* Don't leave him asleep forever when turned off. */

        routinesWake();

    } else {

        check();

    }

    return routinesEnabled;

}


function sleepNow() {

    routinesSleep();

}


function wakeNow() {

    routinesWake();

}


function getStatus() {

    return {

        enabled: routinesEnabled,

        sleepStart: routinesSleepStart,

        sleepEnd: routinesSleepEnd,

        routineSleeping: routineSleeping,

        petMood: routinesPetMood()

    };

}


Aegis.register("routines", {

    version: "1.0.0",


    check,

    getStatus,

    setSleepWindow,

    setEnabled,

    sleepNow,

    wakeNow,


    init() {

        routinesLoad();

        check();

        routinesTimer = setInterval(check, ROUTINES_CHECK_MS);

        console.log("Routines initialized.");

    },


    refresh() {},


    shutdown() {

        if (routinesTimer) {

            clearInterval(routinesTimer);

            routinesTimer = null;

        }

        console.log("Routines shut down.");

    },


    status() {

        return {

            online: true,

            version: this.version,

            enabled: routinesEnabled,

            routineSleeping: routineSleeping

        };

    }

});
