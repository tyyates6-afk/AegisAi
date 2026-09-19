let events = loadData("events");

function parseDateOnly(dateStr){
    const [year, month, day] =
    dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function formatDateOnly(date){
    const year = date.getFullYear();
    const month =
    String(date.getMonth() + 1)
    .padStart(2, "0");
    const day =
    String(date.getDate())
    .padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildOccurrence(event, dateStr, exceptions){
    exceptions = exceptions || {};
    const override = exceptions[dateStr];
    if(override === null){
        return null;
    }
    const base = {
        ...event,
        occurrenceDate: dateStr,
        occurrenceId: `${event.id}_${dateStr}`
    };
    if(override){
        return { ...base, ...override };
    }
    return base;
}

function expandEventOccurrences(sourceEvents, rangeStartStr, rangeEndStr){
    const rangeStart =
    parseDateOnly(rangeStartStr);
    const rangeEnd =
    parseDateOnly(rangeEndStr);
    const occurrences = [];

    sourceEvents.forEach(event => {
        const recurrence =
        event.recurrence || "none";
        const baseDate =
        parseDateOnly(event.date);
        const exceptions = event.exceptions || {};

        if(recurrence === "none"){
            if(
                baseDate >= rangeStart &&
                baseDate < rangeEnd
            ){
                const occ = buildOccurrence(
                    event,
                    event.date,
                    exceptions
                );
                if(occ){
                    occurrences.push(occ);
                }
            }
            return;
        }

        const recurrenceEnd =
        event.recurrenceEnd
        ? parseDateOnly(event.recurrenceEnd)
        : null;

        const hardCap =
        new Date(rangeEnd);
        hardCap.setFullYear(
            hardCap.getFullYear() + 2
        );

        const stopAt =
        recurrenceEnd && recurrenceEnd < hardCap
        ? recurrenceEnd
        : hardCap;

        let cursor =
        new Date(baseDate);

        while(cursor <= stopAt){
            if(cursor >= rangeEnd){
                break;
            }
            if(cursor >= rangeStart){
                const dateStr = formatDateOnly(cursor);
                const occ = buildOccurrence(
                    event,
                    dateStr,
                    exceptions
                );
                if(occ){
                    occurrences.push(occ);
                }
            }

            if(recurrence === "daily"){
                cursor.setDate(
                    cursor.getDate() + 1
                );
            }
            else if(recurrence === "weekly"){
                cursor.setDate(
                    cursor.getDate() + 7
                );
            }
            else if(recurrence === "monthly"){
                cursor.setMonth(
                    cursor.getMonth() + 1
                );
            }
            else if(recurrence === "yearly"){
                cursor.setFullYear(
                    cursor.getFullYear() + 1
                );
            }
            else{
                break;
            }
        }
    });

    return occurrences;
}

async function loadEventsFromCloud(){
    const cloud =
    Aegis
    .getModule("cloud")
    .api;

    const cloudEvents =
    await cloud.load(
        "events"
    );

    if(cloudEvents.length === 0){
        return;
    }

    events =
    cloudEvents.map(event=>({
        id:event.id,
        title:event.title,
        categoryId:event.category_id,
        color:event.color,
        date:event.date,
        time:event.time,
        location:event.location,
        notes:event.notes,
        recurrence:event.recurrence || "none",
        recurrenceEnd:event.recurrence_end || null,
        notifications:event.notifications || [],
        exceptions:event.exceptions || {}
    }));

    saveData(
        "events",
        events
    );

    displayEvents();
    if(window.refreshCalendar){
        window.refreshCalendar();
    }

    console.log(
        "Events loaded from cloud."
    );
}


async function syncEventsToCloud(){
    const cloud =
    Aegis
    .getModule("cloud")
    .api;

    for(const event of events){
        await cloud.save(
            "events",
            {
                ...event,
                exceptions:event.exceptions || {}
            }
        );
    }

    console.log(
        "Events synced."
    );
}

let selectedEventDate = "";
let editingOccurrenceDate = null;


function setEventDate(date){
    selectedEventDate = date;
    document.getElementById(
        "eventDate"
    ).value = date;
}


function getOccurrence(eventId, occurrenceDate){
    const event = events.find(e => e.id === eventId);
    if(!event){
        return null;
    }
    if(event.recurrence === "none"){
        if(event.date !== occurrenceDate){
            return null;
        }
        return {
            ...event,
            occurrenceDate:event.date,
            occurrenceId:`${event.id}_${event.date}`
        };
    }
    return buildOccurrence(
        event,
        occurrenceDate,
        event.exceptions || {}
    );
}

function isOccurrencePastBase(event, occurrenceDate){
    const baseDate = parseDateOnly(event.date);
    const occDate = parseDateOnly(occurrenceDate);
    if(event.recurrence === "none"){
        return false;
    }
    return occDate < baseDate;
}

function applyOverrideToEvent(event, occurrenceDate, override, updateAllFuture){
    if(!event.exceptions){
        event.exceptions = {};
    }

    if(updateAllFuture){
        const baseDate = parseDateOnly(event.date);
        const occDate = parseDateOnly(occurrenceDate);
        if(occDate < baseDate){
            alert(
                "Cannot update past occurrences to change all future. " +
                "Edit the base event instead."
            );
            return false;
        }

        const dates = [];
        let cursor = new Date(baseDate);
        const recurrenceEnd = event.recurrenceEnd
            ? parseDateOnly(event.recurrenceEnd)
            : null;
        const hardCap = new Date();
        hardCap.setFullYear(hardCap.getFullYear() + 2);
        const stopAt = recurrenceEnd && recurrenceEnd < hardCap
            ? recurrenceEnd
            : hardCap;

        while(cursor <= stopAt){
            const ds = formatDateOnly(cursor);
            if(ds >= occurrenceDate){
                dates.push(ds);
            }
            if(event.recurrence === "daily"){
                cursor.setDate(cursor.getDate() + 1);
            } else if(event.recurrence === "weekly"){
                cursor.setDate(cursor.getDate() + 7);
            } else if(event.recurrence === "monthly"){
                cursor.setMonth(cursor.getMonth() + 1);
            } else if(event.recurrence === "yearly"){
                cursor.setFullYear(cursor.getFullYear() + 1);
            } else {
                break;
            }
        }

        dates.forEach(ds => {
            event.exceptions[ds] = { ...override, _isException: true };
        });
    } else {
        event.exceptions[occurrenceDate] = { ...override, _isException: true };
    }

    return true;
}

function addEvent(){
    if(editingEvent){
        saveEventChanges();
        return;
    }

    const title =
    document.getElementById(
        "eventTitle"
    ).value;
    const categoryId =
    document.getElementById(
        "eventCategory"
    ).value;
    const date =
    document.getElementById(
        "eventDate"
    ).value;
    const time =
    document.getElementById(
        "eventTime"
    ).value;
    const location =
    document.getElementById(
        "eventLocation"
    ).value;
    const notes =
    document.getElementById(
        "eventNotes"
    ).value;
    const recurrence =
    document.getElementById(
        "eventRecurrence"
    ).value;
    const recurrenceEnd =
    document.getElementById(
        "eventRecurrenceEnd"
    ).value;
    const notifications = [];
    document.querySelectorAll(
        "#eventNotifications input:checked"
    ).forEach(box => {
        notifications.push(
            Number(box.value)
        );
    });

    if(!title || !date){
        alert(
        "Event name and date required."
        );
        return;
    }

    const categoryInfo =
    categories.find(
        item => item.id === categoryId
    );

    const newEvent = {
        id: Date.now(),
        title:title,
        categoryId:categoryId,
        color:
        categoryInfo ?
        categoryInfo.color :
        "gray",
        date:date,
        time:time,
        location:location,
        notes:notes,
        recurrence:recurrence || "none",
        recurrenceEnd:recurrenceEnd || null,
        notifications:notifications,
        exceptions:{}
    };

    events.push(newEvent);
    sortEvents();
    saveData(
        "events",
        events
    );

    displayEvents();
    clearEventForm();
    syncEventsToCloud();
    Aegis.broadcast("eventsUpdated");
}


async function deleteEvent(id, occurrenceDate = null) {

    const event = events.find(e => e.id === id);

    if (!event) {
        console.error("Event not found:", id);
        return;
    }

    // ---------------------------------
    // DELETE ONE RECURRENCE OCCURRENCE
    // ---------------------------------
    if (occurrenceDate && event.recurrence !== "none") {

        if (!event.exceptions) {
            event.exceptions = {};
        }

        event.exceptions[occurrenceDate] = null;

        saveData("events", events);

        displayEvents();

        if (window.refreshCalendar) {
            window.refreshCalendar();
        }

        Aegis.broadcast("eventsUpdated");

        // Sync exception change to cloud
        try {
            await syncEventsToCloud();
        } catch (error) {
            console.error(
                "Failed to sync deleted occurrence:",
                error
            );
        }

        console.log(
            "Occurrence deleted:",
            id,
            occurrenceDate
        );

        return;
    }

    // ---------------------------------
    // DELETE ENTIRE EVENT
    // ---------------------------------

    // Remove locally FIRST
    events = events.filter(
        event => event.id !== id
    );

    saveData(
        "events",
        events
    );

    // Remove notification records
    const notifiedItems =
        loadData("notifiedItems") || [];

    const filteredNotifications =
        notifiedItems.filter(
            notificationID =>
                !String(notificationID).startsWith(
                    `${id}_`
                )
        );

    saveData(
        "notifiedItems",
        filteredNotifications
    );

    // Update UI immediately
    displayEvents();

    if (window.refreshCalendar) {
        window.refreshCalendar();
    }

    Aegis.broadcast(
        "eventsUpdated"
    );

    console.log(
        "Event deleted locally:",
        id
    );

    // ---------------------------------
    // DELETE FROM CLOUD
    // ---------------------------------

    try {

        const cloud =
            Aegis
                .getModule("cloud")
                .api;

        const deleted =
            await cloud.delete(
                "events",
                id
            );

        if (!deleted) {
            console.error(
                "Cloud delete failed:",
                id
            );
            return;
        }

        console.log(
            "Event deleted from cloud:",
            id
        );

    } catch (error) {

        console.error(
            "Cloud delete error:",
            error
        );

    }
}

function sortEvents(){
    events.sort((a, b) => {
        const aDateTime =
            `${a.date || "9999-12-31"}T${a.time || "00:00"}`;
        const bDateTime =
            `${b.date || "9999-12-31"}T${b.time || "00:00"}`;
        return aDateTime.localeCompare(bDateTime);
    });
}

function displayEvents(){
    sortEvents();
    const list =
    document.getElementById(
        "eventList"
    );

    if(!list) return;
    list.innerHTML = "";

    events.forEach(event => {
        const category =
        categories.find(
            c => c.id === event.categoryId
        );
        const categoryName =
        category?.name || "Unknown";

        let div =
        document.createElement(
            "div"
        );

        div.className =
        "event-item";

        let recurrenceLabel = "";
        if(event.recurrence && event.recurrence !== "none"){
            recurrenceLabel =
            ` 🔁 Repeats: ${event.recurrence}${event.recurrenceEnd ? " until " + event.recurrenceEnd : ""}`;
        }

        let exceptionNote = "";
        const exceptionCount = event.exceptions
            ? Object.keys(event.exceptions).filter(k => event.exceptions[k] !== null).length
            : 0;
        if(exceptionCount > 0){
            exceptionNote =
            `<br><span class="exception-hint">✏️ ${exceptionCount} exception(s) — click Edit to modify individual occurrences</span>`;
        }

        div.innerHTML = `
        <strong>
        📅 ${event.title}
        </strong>

        <br>

        🏷️ Category:
        ${categoryName}

        <br>

        📆 Date:
        ${event.date}

        <br>

        ⏰ Time:
        ${event.time || "No time set"}
        ${event.location ? `
        <br>
        📍 Location:
        ${event.location}
        ` : ""}
        ${event.notes ? `
        <br>
        📝 Notes:
        ${event.notes}
        ` : ""}
        ${recurrenceLabel}
        ${exceptionNote}
        <br><br>

        <button onclick="editEvent(${event.id})">
        Edit
        </button>

        <button onclick="deleteEvent(${event.id}, null)">
        Delete
        </button>

        <hr>
        `;

        list.appendChild(div);
    });
}


function clearEventForm(){
    document.getElementById(
    "eventTitle"
    ).value="";

    document.getElementById(
    "eventLocation"
    ).value="";

    document.getElementById(
    "eventNotes"
    ).value="";

    document.getElementById(
    "eventRecurrence"
    ).value="none";

    document.getElementById(
    "eventRecurrenceEnd"
    ).value="";

    document
    .querySelectorAll(
    "#eventNotifications input"
    )
    .forEach(box => {
        box.checked = false;
    });
}

let editingEvent = null;


function editEvent(id, occurrenceDate){
    editingOccurrenceDate = occurrenceDate || null;

    if(occurrenceDate){
        const event = events.find(e => e.id === id);
        if(!event){
            return;
        }
        const exception = (event.exceptions || {})[occurrenceDate];
        const baseForDisplay = {
            ...event,
            ...(exception || {})
        };

        editingEvent = {
            id:event.id,
            title:baseForDisplay.title,
            categoryId:baseForDisplay.categoryId,
            color:baseForDisplay.color,
            date:event.date,
            time:baseForDisplay.time,
            location:baseForDisplay.location,
            notes:baseForDisplay.notes,
            recurrence:event.recurrence || "none",
            recurrenceEnd:event.recurrenceEnd || null,
            notifications:baseForDisplay.notifications || event.notifications || [],
            _isExceptionEdit: true,
            _originalDate: event.date,
            _occurrenceDate: occurrenceDate,
            _targetId: id
        };

        document.getElementById(
            "eventTitle"
        ).value = editingEvent.title;

        document.getElementById(
            "eventCategory"
        ).value = editingEvent.categoryId;

        document.getElementById(
            "eventDate"
        ).value = occurrenceDate;

        document.getElementById(
            "eventTime"
        ).value = editingEvent.time;

        document.getElementById(
            "eventLocation"
        ).value = editingEvent.location;

        document.getElementById(
            "eventNotes"
        ).value = editingEvent.notes;

        document.getElementById(
            "eventRecurrence"
        ).value = "none";

        document.getElementById(
            "eventRecurrenceEnd"
        ).value = "";

        document.querySelectorAll(
            "#eventNotifications input"
        ).forEach(box => {
            box.checked =
            editingEvent.notifications?.includes(
            Number(box.value)
            ) || false;
        });

        document.getElementById(
            "saveEventButton"
        ).innerText =
        "Save Exception";

        // Clear any previous edit-occurrence UI
        const banner = document.getElementById("editOccurrenceBanner");
        const actions = document.getElementById("editOccurrenceActions");
        const prevUpdateRow = document.getElementById("updateAllFutureRow");
        if(prevUpdateRow) prevUpdateRow.remove();
        banner.style.display = "none";
        actions.style.display = "none";
        document.getElementById("saveSingleOccurrence").style.display = "none";
        document.getElementById("saveAllFutureOccurrences").style.display = "none";

        // Show the banner
        const categoryInfo = categories.find(c => c.id === editingEvent.categoryId);
        banner.innerHTML = `
            <strong>✏️ Editing occurrence of recurring event</strong><br>
            <span style="font-size:0.9em;color:#8db6c9;">
                Event: ${editingEvent.title}<br>
                Original date: ${editingEvent._originalDate}<br>
                Occurrence date: ${editingEvent._occurrenceDate}
                ${categoryInfo ? '<br>Category: ' + categoryInfo.name : ''}
            </span>
        `;
        banner.style.display = "block";

        // Show the two buttons
        actions.style.display = "flex";
        document.getElementById("saveSingleOccurrence").style.display = "inline-block";
        document.getElementById("saveAllFutureOccurrences").style.display = "inline-block";

        return;
    }

    editingEvent =
    events.find(
        event => event.id === id
    );

    if(!editingEvent)
    return;

    document.getElementById(
        "eventTitle"
    ).value =
    editingEvent.title;

    document.getElementById(
        "eventCategory"
    ).value =
    editingEvent.categoryId;

    document.getElementById(
        "eventDate"
    ).value =
    editingEvent.date;

    document.getElementById(
        "eventTime"
    ).value =
    editingEvent.time;

    document.getElementById(
        "eventLocation"
    ).value =
    editingEvent.location;

    document.getElementById(
        "eventNotes"
    ).value =
    editingEvent.notes;

    document.getElementById(
        "eventRecurrence"
    ).value =
    editingEvent.recurrence || "none";

    document.getElementById(
        "eventRecurrenceEnd"
    ).value =
    editingEvent.recurrenceEnd || "";

    document.querySelectorAll(
        "#eventNotifications input"
    ).forEach(box => {
        box.checked =
        editingEvent.notifications?.includes(
        Number(box.value)
    ) || false;
    });

    document.getElementById(
        "saveEventButton"
    ).innerText =
    "Save Changes";

    let updateAllRow = document.querySelector("#updateAllFutureRow");
    if(updateAllRow){
        updateAllRow.remove();
    }

    // Hide occurrence edit UI
    document.getElementById("editOccurrenceBanner").style.display = "none";
    document.getElementById("editOccurrenceActions").style.display = "none";
    document.getElementById("saveSingleOccurrence").style.display = "none";
    document.getElementById("saveAllFutureOccurrences").style.display = "none";
}

function saveEventChanges(){
    if(!editingEvent){
        return;
    }

    const title =
    document.getElementById(
        "eventTitle"
    ).value;

    const categoryId =
    document.getElementById(
        "eventCategory"
    ).value;

    const dateField =
    document.getElementById(
        "eventDate"
    ).value;

    const time =
    document.getElementById(
        "eventTime"
    ).value;

    const location =
    document.getElementById(
        "eventLocation"
    ).value;

    const notes =
    document.getElementById(
        "eventNotes"
    ).value;

    const notifications = [];
    document.querySelectorAll(
    "#eventNotifications input:checked"
    )
    .forEach(box=>{
        editingEvent.notifications.push(
            Number(box.value)
        );
    });

    const updateAllFuture =
        editingEvent._editMode === "allFuture";

    editingEvent.title = title;
    editingEvent.categoryId = categoryId;
    editingEvent.time = time;
    editingEvent.location = location;
    editingEvent.notes = notes;
    editingEvent.notifications = notifications;

    if(editingEvent._isExceptionEdit){
        const targetEvent = events.find(
            e => e.id === editingEvent._targetId
        );
        if(!targetEvent){
            editingEvent = null;
            document.getElementById("saveEventButton").innerText = "Save Event";
            displayEvents();
            if(window.refreshCalendar){
                window.refreshCalendar();
            }
            Aegis.broadcast("eventsUpdated");
            return;
        }

        editingEvent.time = time;
        editingEvent.location = location;
        editingEvent.notes = notes;
        editingEvent.title = title;
        editingEvent.categoryId = categoryId;
        editingEvent.notifications = notifications;

        const override = {
            title:editingEvent.title,
            categoryId:editingEvent.categoryId,
            color: categoryId ? (
                categories.find(c => c.id === categoryId)?.color ||
                "gray"
            ) : targetEvent.color,
            time:editingEvent.time,
            location:editingEvent.location,
            notes:editingEvent.notes,
            notifications:editingEvent.notifications
        };

        const success = applyOverrideToEvent(
            targetEvent,
            editingEvent._occurrenceDate,
            override,
            updateAllFuture
        );

        if(!success){
            editingEvent = null;
            document.getElementById("saveEventButton").innerText = "Save Event";
            displayEvents();
            return;
        }

        saveData("events", events);
        syncEventsToCloud();
        editingEvent = null;
        editingOccurrenceDate = null;

        document.getElementById("saveEventButton").innerText = "Save Event";
        displayEvents();

        if(window.refreshCalendar){
            window.refreshCalendar();
        }

        Aegis.broadcast("eventsUpdated");
        return;
    }

    editingEvent.date = dateField;
    editingEvent.recurrence =
    document.getElementById(
        "eventRecurrence"
    ).value || "none";

    editingEvent.recurrenceEnd =
    document.getElementById(
        "eventRecurrenceEnd"
    ).value || null;

    editingEvent.exceptions = {};

    saveData(
        "events",
        events
    );

    syncEventsToCloud();
    editingEvent = null;
    editingOccurrenceDate = null;

    document.getElementById(
        "saveEventButton"
    ).innerText =
    "Save Event";

    displayEvents();

    if(window.refreshCalendar){
        window.refreshCalendar();
    }

    Aegis.broadcast("eventsUpdated");
}

const GOOGLE_CALENDAR = {

    auth: null,
    clientId: "525444472618-c47e4nbbo5cugtkpq248t22919k2nl4h.apps.googleusercontent.com",
    calendarId: "primary",

    /* ==================================
       INIT
    ================================== */

    init(){

        const token =
            localStorage.getItem(
                "google_calendar_token"
            );

        if(token){

            try{

                this.auth =
                    JSON.parse(token);

            }catch(error){

                console.error(
                    "Invalid Google Calendar token:",
                    error
                );

                localStorage.removeItem(
                    "google_calendar_token"
                );

            }

        }

        this._updateUI();

    },


    /* ==================================
       CONNECT
    ================================== */

    async connect() {
        try {
            if (!window.google || !google.accounts || !google.accounts.oauth2) {
                alert("Google Identity Services is not loaded yet. Please refresh the page and try again.");
                return;
            }

            const client = google.accounts.oauth2.initTokenClient({
                client_id: this.clientId,
                scope: "https://www.googleapis.com/auth/calendar",
                callback: (response) => {
                    if (response.error) {
                        console.error("Google Calendar OAuth error:", response);
                        alert("Google Calendar authorization failed.");
                        return;
                    }

                    this.auth = {
                        access_token: response.access_token,
                        expires_at: Date.now() + ((response.expires_in || 3600) * 1000)
                    };

                    localStorage.setItem(
                        "google_calendar_token",
                        JSON.stringify(this.auth)
                    );

                    console.log("✓ Google Calendar connected");

                    this._updateUI();

                    if (typeof this._onConnected === "function") {
                        this._onConnected();
                    }
                }
            });

            client.requestAccessToken();
        } catch (error) {
            console.error("Google Calendar connection failed:", error);
            alert("Unable to connect Google Calendar.");
        }
    },


    /* ==================================
       TOKEN
    ================================== */

    async ensureToken(){

        if(!this.auth){

            throw new Error(
                "Google Calendar is not connected."
            );

        }

        if(
            !this.auth.access_token
        ){

            throw new Error(
                "No Google access token."
            );

        }

        return this.auth.access_token;

    },


    /* ==================================
       API REQUEST
    ================================== */

    async apiRequest(
        url,
        options = {}
    ){

        const token =
            await this.ensureToken();

        const response =
            await fetch(
                url,
                {
                    ...options,

                    headers:{
                        ...(options.headers || {}),

                        Authorization:
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"
                    }
                }
            );

        if(!response.ok){

            let errorData = {};

            try{
                errorData =
                    await response.json();
            }catch{}

            throw new Error(
                errorData.error?.message ||
                errorData.message ||
                `Google Calendar API error ${response.status}`
            );

        }

        if(response.status === 204){

            return null;

        }

        return response.json();

    },


    /* ==================================
       BUILD GOOGLE EVENT
    ================================== */

    buildGoogleEvent(event){

        const payload = {

            summary:
                event.title || "AEGIS Event",

            description:
                event.notes || "",

            location:
                event.location || "",

            extendedProperties:{
                private:{
                    aegis_id:
                        String(event.id)
                }
            }

        };


        /*
           ALL DAY EVENT
        */

        if(!event.time){

            payload.start = {
                date: event.date
            };

            payload.end = {
                date:
                    this.addOneDay(
                        event.date
                    )
            };

        }


        /*
           TIMED EVENT
        */

        else{

            const start =
                `${event.date}T${event.time}:00`;

            const end =
                this.calculateEndTime(
                    event.date,
                    event.time
                );

            payload.start = {
                dateTime: start
            };

            payload.end = {
                dateTime: end
            };

        }


        /*
           RECURRENCE
        */

        if(
            event.recurrence &&
            event.recurrence !== "none"
        ){

            const rule =
                this.buildRecurrenceRule(
                    event
                );

            if(rule){

                payload.recurrence = [
                    rule
                ];

            }

        }


        return payload;

    },


    /* ==================================
       RECURRENCE
    ================================== */

    buildRecurrenceRule(event){

        const frequencyMap = {

            daily: "DAILY",

            weekly: "WEEKLY",

            monthly: "MONTHLY",

            yearly: "YEARLY"

        };

        const freq =
            frequencyMap[
                event.recurrence
            ];

        if(!freq){

            return null;

        }

        let rule =
            `RRULE:FREQ=${freq}`;

        if(event.recurrenceEnd){

            const until =
                event.recurrenceEnd
                    .replaceAll("-", "") +
                "T235959Z";

            rule +=
                `;UNTIL=${until}`;

        }

        return rule;

    },


    /* ==================================
       FIND AEGIS EVENT IN GOOGLE
    ================================== */

    async findGoogleEvent(localId){

        const url =
            "https://www.googleapis.com/calendar/v3/" +
            `calendars/${encodeURIComponent(this.calendarId)}` +
            "/events" +
            "?privateExtendedProperty=" +
            encodeURIComponent(
                `aegis_id=${localId}`
            );

        const data =
            await this.apiRequest(
                url
            );

        return (
            data.items &&
            data.items.length
        )
            ? data.items[0]
            : null;

    },


    /* ==================================
       CREATE
    ================================== */

    async createGoogleEvent(event){

        const payload =
            this.buildGoogleEvent(
                event
            );

        const url =
            "https://www.googleapis.com/calendar/v3/" +
            `calendars/${encodeURIComponent(this.calendarId)}` +
            "/events";

        return this.apiRequest(
            url,
            {
                method:"POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    },


    /* ==================================
       UPDATE
    ================================== */

    async updateGoogleEvent(
        googleEventId,
        event
    ){

        const payload =
            this.buildGoogleEvent(
                event
            );

        const url =
            "https://www.googleapis.com/calendar/v3/" +
            `calendars/${encodeURIComponent(this.calendarId)}` +
            `/events/${encodeURIComponent(googleEventId)}`;

        return this.apiRequest(
            url,
            {
                method:"PATCH",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );

    },


    /* ==================================
       DELETE
    ================================== */

    async deleteGoogleEvent(
        googleEventId
    ){

        const token =
            await this.ensureToken();

        const url =
            "https://www.googleapis.com/calendar/v3/" +
            `calendars/${encodeURIComponent(this.calendarId)}` +
            `/events/${encodeURIComponent(googleEventId)}`;

        const response =
            await fetch(
                url,
                {
                    method:"DELETE",

                    headers:{
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );

        if(
            !response.ok &&
            response.status !== 404
        ){

            throw new Error(
                `Google delete failed: ${response.status}`
            );

        }

    },


    /* ==================================
       SYNC AEGIS → GOOGLE
    ================================== */

    async syncToGoogle(){

        if(!this.auth){

            alert(
                "Connect Google Calendar first."
            );

            return;

        }

        console.log(
            "Starting AEGIS → Google Calendar sync..."
        );


        for(const event of events){

            try{

                const existing =
                    await this.findGoogleEvent(
                        event.id
                    );


                if(existing){

                    await this.updateGoogleEvent(
                        existing.id,
                        event
                    );

                    console.log(
                        "Google event updated:",
                        event.id
                    );

                }else{

                    await this.createGoogleEvent(
                        event
                    );

                    console.log(
                        "Google event created:",
                        event.id
                    );

                }

            }catch(error){

                console.error(
                    "Google sync failed:",
                    event.id,
                    error
                );

            }

        }


        alert(
            "AEGIS → Google Calendar sync complete."
        );

    },


    /* ==================================
       GOOGLE → AEGIS
    ================================== */

    async syncFromGoogle(){

        if(!this.auth){

            throw new Error(
                "Google Calendar is not connected."
            );

        }

        console.log(
            "Starting Google Calendar → AEGIS sync..."
        );


        const url =
            "https://www.googleapis.com/calendar/v3/" +
            `calendars/${encodeURIComponent(this.calendarId)}` +
            "/events" +
            "?singleEvents=true" +
            "&showDeleted=false" +
            "&maxResults=2500";

        const data =
            await this.apiRequest(
                url
            );

        const googleEvents =
            data.items || [];


        for(
            const googleEvent
            of googleEvents
        ){

            const aegisId =
                googleEvent
                    .extendedProperties
                    ?.private
                    ?.aegis_id;

            /*
               Ignore Google events that were
               not created by AEGIS.
            */

            if(!aegisId){

                continue;

            }


            const localEvent =
                events.find(
                    event =>
                        String(event.id) ===
                        String(aegisId)
                );

            if(!localEvent){

                continue;

            }


            /*
               Update basic information
            */

            localEvent.title =
                googleEvent.summary ||
                localEvent.title;

            localEvent.notes =
                googleEvent.description ||
                "";

            localEvent.location =
                googleEvent.location ||
                "";


            /*
               ALL DAY
            */

            if(
                googleEvent.start?.date
            ){

                localEvent.date =
                    googleEvent.start.date;

                localEvent.time = "";

            }


            /*
               TIMED
            */

            else if(
                googleEvent.start?.dateTime
            ){

                const dateTime =
                    new Date(
                        googleEvent.start.dateTime
                    );

                localEvent.date =
                    formatDateOnly(
                        dateTime
                    );

                localEvent.time =
                    dateTime
                        .toTimeString()
                        .slice(0,5);

            }

        }


        saveData(
            "events",
            events
        );

        displayEvents();

        if(window.refreshCalendar){

            window.refreshCalendar();

        }

        Aegis.broadcast(
            "eventsUpdated"
        );

        console.log(
            "Google Calendar → AEGIS sync complete."
        );

    },


    /* ==================================
       DATE HELPERS
    ================================== */

    addOneDay(dateString){

        const date =
            parseDateOnly(
                dateString
            );

        date.setDate(
            date.getDate() + 1
        );

        return formatDateOnly(
            date
        );

    },


    calculateEndTime(
        date,
        time
    ){

        const start =
            new Date(
                `${date}T${time}:00`
            );

        /*
           Default event duration:
           1 hour
        */

        start.setHours(
            start.getHours() + 1
        );

        return (
            start
                .toISOString()
                .slice(0,19)
        );

    },


    /* ==================================
       DISCONNECT
    ================================== */

    disconnect(){

        this.auth = null;

        localStorage.removeItem(
            "google_calendar_token"
        );

        this._updateUI();

        alert(
            "Disconnected from Google Calendar."
        );

    },


    isConnected(){

        return !!this.auth;

    },


    /* ==================================
       UI
    ================================== */

    _updateUI(){

        const connectBtn =
            document.getElementById(
                "gcalConnectBtn"
            );

        const syncBtn =
            document.getElementById(
                "gcalSyncBtn"
            );

        const disconnectBtn =
            document.getElementById(
                "gcalDisconnectBtn"
            );

        const status =
            document.getElementById(
                "gcalStatus"
            );


        if(connectBtn){

            connectBtn.style.display =
                this.auth
                    ? "none"
                    : "inline-block";

        }


        if(syncBtn){

            syncBtn.disabled =
                !this.auth;

            syncBtn.style.cursor =
                this.auth
                    ? "pointer"
                    : "not-allowed";

        }


        if(disconnectBtn){

            disconnectBtn.disabled =
                !this.auth;

            disconnectBtn.style.cursor =
                this.auth
                    ? "pointer"
                    : "not-allowed";

        }


        if(status){

            status.textContent =
                this.auth
                    ? "Connected to Google Calendar"
                    : "Not connected to Google Calendar.";

            status.style.color =
                this.auth
                    ? "#4caf50"
                    : "#888";

        }

    },


    _onConnected(){

        this._updateUI();

        Aegis.broadcast(
            "googleCalendarConnected"
        );

    }

};

GOOGLE_CALENDAR.init();

displayEvents();

if(window.refreshCalendar){
    window.refreshCalendar();
}

Aegis.register("events", {
    version: "2.0.0",

    init(){
        loadEventsFromCloud();
        console.log(
            "Events initialized."
        );

        Aegis.listen("categoriesUpdated", () => {
            updateCategoryMenus();
        });

        Aegis.listen("googleCalendarConnected", () => {
            console.log("Google Calendar connected, events module notified.");
        });
    },

    refresh(){
        displayEvents();
        loadEventsFromCloud();
    },

    getTodaysEvents() {
        const now = new Date();
        const todayStr =
        formatDateOnly(now);
        const tomorrow =
        new Date(now);
        tomorrow.setDate(
            tomorrow.getDate() + 1
        );
        const tomorrowStr =
        formatDateOnly(tomorrow);

        return expandEventOccurrences(
            events,
            todayStr,
            tomorrowStr
        )
        .map(occurrence => ({
            ...occurrence,
            date: occurrence.occurrenceDate
        }));
    },

    getEventsForDate(dateStr){
        const nextDay = new Date(parseDateOnly(dateStr));
        nextDay.setDate(nextDay.getDate() + 1);
        return expandEventOccurrences(
            events,
            dateStr,
            formatDateOnly(nextDay)
        );
    },

    getEventsForWeek(dateStr){
        const start = parseDateOnly(dateStr);
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return expandEventOccurrences(
            events,
            formatDateOnly(start),
            formatDateOnly(end)
        );
    },

    getEventsForYear(year){
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        end.setDate(end.getDate() + 1);
        return expandEventOccurrences(
            events,
            formatDateOnly(start),
            formatDateOnly(end)
        );
    },

    shutdown() {
        console.log("Events shutting down.");
    },

    status() {
        return {
            online: true,
            version: this.version
        };
    },

    getGoogleCalendar(){
        return GOOGLE_CALENDAR;
    }
});

window.setEditMode = function(mode){
    if(editingEvent && editingEvent._isExceptionEdit){
        editingEvent._editMode = mode;
    }
};

window.loadEventsFromCloud =
loadEventsFromCloud;

window.expandEventOccurrences =
expandEventOccurrences;

window.editEvent =
editEvent;

window.deleteEvent =
deleteEvent;

window.getOccurrence =
getOccurrence;

window.GOOGLE_CALENDAR =
GOOGLE_CALENDAR;

window.handleGCalConnect =
GOOGLE_CALENDAR.connect.bind(GOOGLE_CALENDAR);

window.handleGCalSync =
GOOGLE_CALENDAR.syncToGoogle.bind(GOOGLE_CALENDAR);

window.handleGCalDisconnect =
GOOGLE_CALENDAR.disconnect.bind(GOOGLE_CALENDAR);
