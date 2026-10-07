/*======================================
        AEGIS CALENDAR v2.1.0
======================================

    Planner calendar (FullCalendar).

    v2.1.0: FullCalendar (~340KB) no longer downloads at boot.
    It lazy-loads the first time the Planner page opens
    (via the "navigation:planner" broadcast), or the first
    time any calendar API is called. Until it loads, the
    planner shows a small "Loading calendar..." note.

    Requires the lazy script loader from index.html:
        window.aegisLoadScript(url) -> Promise
        window.AEGIS_CDN.fullcalendar

======================================*/


let aegisCalendar;

let currentView = "month";

let currentDate = new Date();

let aegisCalendarPromise = null;


/* Load FullCalendar (once) and build the calendar. Safe to
   call many times — concurrent callers share one promise. */

function ensureAegisCalendar() {

    if (aegisCalendar) {

        return Promise.resolve(aegisCalendar);

    }

    if (aegisCalendarPromise) {

        return aegisCalendarPromise;

    }

    const calendarEl = document.getElementById("calendar");

    if (calendarEl) {

        calendarEl.innerHTML =
            '<p class="empty-state">Loading calendar...</p>';

    }

    aegisCalendarPromise =

        window.aegisLoadScript(window.AEGIS_CDN.fullcalendar)

            .then(() => {

                const el = document.getElementById("calendar");

                if (!el) {

                    throw new Error("Calendar element missing.");

                }

                el.innerHTML = "";

                aegisCalendar =

                    new FullCalendar.Calendar(el, {

                        height: "auto",

                        expandRows: true,

                        initialView: "dayGridMonth",

                        eventDisplay: "block",

                        headerToolbar: {

                            left: "prev,next today",

                            center: "title",

                            right: "dayGridMonth,timeGridWeek,timeGridDay,year"

                        },

                        views: {

                            year: {

                                type: "dayGridYear",

                                duration: { year: 1 }

                            }

                        },

                        events: getCalendarEvents,

                        dateClick(info) {

                            setEventDate(info.dateStr);

                        },

                        eventClick(info) {

                            const props = info.event.extendedProps;

                            if (props.isRecurrence &&
                                props.occurrenceDate !== props.baseDate) {

                                editEvent(
                                    props.originalId,
                                    props.occurrenceDate
                                );

                            } else {

                                editEvent(props.originalId);

                            }

                        },

                        datesSet(info) {

                            currentDate = info.start;

                        }

                    });

                aegisCalendar.render();

                return aegisCalendar;

            })

            .catch((error) => {

                /* Let a later attempt retry the download. */

                aegisCalendarPromise = null;

                const el = document.getElementById("calendar");

                if (el) {

                    el.innerHTML =
                        '<p class="empty-state">' +
                        'Calendar failed to load. Check your connection ' +
                        'and reopen the Planner.' +
                        '</p>';

                }

                console.error("Calendar lazy-load failed:", error);

                return null;

            });

    return aegisCalendarPromise;

}


function getCalendarEvents(fetchInfo, successCallback, failureCallback) {

    try {

        const sourceEvents = loadData("events") || [];

        const start = fetchInfo.startStr.split("T")[0];
        const end = fetchInfo.endStr.split("T")[0];

        console.log("Calendar loading events:", {
            count: sourceEvents.length,
            start,
            end,
            events: sourceEvents
        });

        const occurrences = expandEventOccurrences(
            sourceEvents,
            start,
            end
        );

        const calendarEvents = occurrences.map(occurrence => ({

            title: occurrence.title,

            start:
                occurrence.occurrenceDate +
                (
                    occurrence.time
                        ? "T" + occurrence.time
                        : ""
                ),

            backgroundColor: occurrence.color || "#00d9ff",
            borderColor: occurrence.color || "#00d9ff",

            editable: false,

            extendedProps: {
                originalId: occurrence.id,
                occurrenceDate: occurrence.occurrenceDate,
                baseDate: occurrence.date,

                isRecurrence:
                    occurrence.recurrence &&
                    occurrence.recurrence !== "none"
            }

        }));

        console.log(
            "Calendar events generated:",
            calendarEvents
        );

        successCallback(calendarEvents);

    } catch (error) {

        console.error(
            "Calendar event loading failed:",
            error
        );

        failureCallback(error);

    }

}

function refreshCalendar(){
    if(aegisCalendar){
        aegisCalendar.refetchEvents();
    }
}

Aegis.listen(
    "eventsUpdated",
    function(){
        refreshCalendar();
    }
);

Aegis.register("calendar", {
    version: "2.1.0",

    init() {
        console.log("Calendar initialized.");

        /* First Planner visit builds the calendar on demand. */

        Aegis.listen(
            "navigation:planner",
            () => {

                ensureAegisCalendar().then((cal) => {

                    if (cal) {

                        cal.updateSize();

                    }

                });

            }
        );

        Aegis.listen(
            "googleCalendarConnected",
            async () => {

                console.log(
                    "GCal connected — refreshing calendar."
                );

                try {

                    const google =
                        window.GOOGLE_CALENDAR;

                    if(
                        google &&
                        google.syncFromGoogle
                    ){

                        await google.syncFromGoogle();

                    }

                    refreshCalendar();

                } catch(error){

                    console.error(
                        "Google Calendar refresh failed:",
                        error
                    );

                }

            }
        );
    },

    refresh() {
        refreshCalendar();
    },

    shutdown() {
        console.log("Calendar shutting down.");
    },

    status() {
        return {
            online: true,
            version: this.version
        };
    },

    switchView(view){
        ensureAegisCalendar();
        if(!aegisCalendar) return;
        aegisCalendar.changeView(view);
        currentView = view;
    },

    goToDate(dateStr){
        ensureAegisCalendar();
        if(!aegisCalendar) return;
        aegisCalendar.gotoDate(dateStr);
    },

    getCurrentView(){
        return currentView;
    },

    getCurrentDate(){
        return currentDate;
    }
});

window.refreshCalendar =
refreshCalendar;

window.switchCalendarView = function(view){
    ensureAegisCalendar();
    if(aegisCalendar){
        aegisCalendar.changeView(view);
    }
};
