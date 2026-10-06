/*======================================
        AEGIS TIMER v1.0.0
======================================

    A standalone countdown backend for AEGIS.

    SETUP:
    1. Save this file as JS/timer.js
    2. Add <script src="JS/timer.js"></script> after core.js
       (load it BEFORE focus.js — focus uses this module)

    USE:
    - Aegis.run("timer", "start", 90, {
          onTick: (remainingSec) => { ... },
          onDone: () => { ... }
      });
    - Aegis.run("timer", "pause")
    - Aegis.run("timer", "resume")
    - Aegis.run("timer", "stop")    // stops silently, onDone is NOT fired
    - Aegis.run("timer", "getStatus")

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

    if (timerOnTick) {

        try { timerOnTick(timerRemainingSec); } catch (error) {}

    }

    if (timerRemainingSec <= 0) {

        const done = timerOnDone;

        timerStop();

        if (done) {

            try { done(); } catch (error) {}

        }

    }

}


function timerStart(seconds, callbacks) {

    timerStop();

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


function timerStop() {

    timerClear();

    const wasActive = timerActive;

    timerActive = false;

    timerPaused = false;

    timerOnTick = null;

    timerOnDone = null;

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


Aegis.register("timer", {

    version: "1.0.0",


    start: timerStart,

    pause: timerPause,

    resume: timerResume,

    stop: timerStop,

    getStatus: timerGetStatus,


    init() {

        console.log("Timer initialized.");

    },


    refresh() {},


    shutdown() {

        timerStop();

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
