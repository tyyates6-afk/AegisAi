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


async function deleteEvent(id, occurrenceDate){
    if(occurrenceDate){
        const event = events.find(e => e.id === id);
        if(!event){
            return;
        }
        if(event.recurrence === "none"){
            occurrenceDate = null;
        } else {
            if(!event.exceptions){
                event.exceptions = {};
            }
            event.exceptions[occurrenceDate] = null;
            saveData("events", events);
            syncEventsToCloud();
            displayEvents();
            if(window.refreshCalendar){
                window.refreshCalendar();
            }
            Aegis.broadcast("eventsUpdated");
            return;
        }
    }

    const cloud =
        Aegis
            .getModule("cloud")
            .api;

    const deleted =
        await cloud.delete(
            "events",
            id
        );

    if(!deleted){
        console.error(
            "Failed to delete event from cloud."
        );
        alert(
            "Could not delete the event from the cloud."
        );
        return;
    }

    events =
        events.filter(
            event =>
                event.id !== id
        );

    saveData(
        "events",
        events
    );

    const notifiedItems =
    loadData("notifiedItems") || [];

    notifiedItems =
        notifiedItems.filter(
            notificationID =>
                !notificationID.startsWith(
                    `${id}_`
                )
        );

    saveData(
        "notifiedItems",
        notifiedItems
    );

    displayEvents();

    if(window.refreshCalendar){
        window.refreshCalendar();
    }

    Aegis.broadcast(
        "eventsUpdated"
    );

    console.log(
        "Event deleted:",
        id
    );
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

        const editArea = document.querySelector("#saveEventButton").parentElement;
        let updateAllRow = editArea.querySelector("#updateAllFutureRow");
        if(!updateAllRow){
            updateAllRow = document.createElement("div");
            updateAllRow.id = "updateAllFutureRow";
            updateAllRow.style.marginTop = "8px";
            updateAllRow.innerHTML = `
            <label>
                <input type="checkbox" id="updateAllFuture">
                Update this and all future occurrences
            </label>
            <p style="font-size:0.8em;color:#888;margin-top:2px;">
                Uncheck to change only this single occurrence.
            </p>
            `;
            editArea.appendChild(updateAllRow);
        }
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
    document.getElementById("updateAllFuture")?.checked || false;

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

    init(){
        const token = localStorage.getItem("google_calendar_token");
        if(token){
            try{
                this.auth = JSON.parse(token);
            } catch(e){
                localStorage.removeItem("google_calendar_token");
            }
        }
        this._updateUI();
    },

    async connect(){
        const clientId = localStorage.getItem("google_client_id");
        if(!clientId){
            alert(
                "Google Calendar is not configured. " +
                "Set google_client_id in your settings first."
            );
            return;
        }

        const authUrl =
            "https://accounts.google.com/o/oauth2/v2/auth?" +
            `client_id=${encodeURIComponent(clientId)}` +
            "&redirect_uri=urn:ietf:wg:oauth:2.0:oob" +
            "&response_type=code" +
            "&scope=https://www.googleapis.com/auth/calendar.events" +
            "&access_type=offline" +
            "&prompt=consent";

        const width = 600;
        const height = 700;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        const popup = window.open(
            authUrl,
            "google_auth",
            `width=${width},height=${height},left=${left},top=${top}`
        );

        const poll = setInterval(() => {
            try{
                if(!popup || popup.closed){
                    clearInterval(poll);
                    return;
                }
                const params = new URLSearchParams(popup.location.search);
                if(params.has("code")){
                    popup.close();
                    clearInterval(poll);
                    this._exchangeCode(params.get("code"));
                } else if(params.has("error")){
                    popup.close();
                    clearInterval(poll);
                    alert("Google auth cancelled: " + params.get("error"));
                }
            } catch(e){
                // popup may not have access to opener location
            }
        }, 500);
    },

    async _exchangeCode(code){
        const clientSecret = localStorage.getItem("google_client_secret");
        if(!clientSecret){
            alert("Google client secret is not configured.");
            return;
        }

        try{
            const resp = await fetch(
                "https://oauth2.googleapis.com/token",
                {
                    method:"POST",
                    headers:{"Content-Type":"application/x-www-form-urlencoded"},
                    body: new URLSearchParams({
                        code,
                        client_id:localStorage.getItem("google_client_id"),
                        client_secret:clientSecret,
                        redirect_uri:"urn:ietf:wg:oauth:2.0:oob",
                        grant_type:"authorization_code"
                    })
                }
            );

            const data = await resp.json();
            if(!resp.ok){
                throw new Error(data.error || "Token exchange failed");
            }

            this.auth = {
                access_token:data.access_token,
                refresh_token:data.refresh_token,
                token_type:data.token_type,
                expires_in:data.expires_in,
                expiry: Date.now() + (data.expires_in * 1000)
            };

            localStorage.setItem(
                "google_calendar_token",
                JSON.stringify(this.auth)
            );

            this._onConnected();
        } catch(err){
            alert("Failed to connect Google Calendar: " + err.message);
        }
    },

    ensureToken(){
        if(!this.auth){
            return Promise.reject("Not connected");
        }
        if(Date.now() >= (this.auth.expiry || 0)){
            return this.refreshToken();
        }
        return Promise.resolve(this.auth.access_token);
    },

    async refreshToken(){
        if(!this.auth?.refresh_token){
            return Promise.reject("No refresh token");
        }
        const clientSecret = localStorage.getItem("google_client_secret");
        if(!clientSecret){
            return Promise.reject("Missing client secret");
        }
        const resp = await fetch(
            "https://oauth2.googleapis.com/token",
            {
                method:"POST",
                headers:{"Content-Type":"application/x-www-form-urlencoded"},
                body: new URLSearchParams({
                    client_id:localStorage.getItem("google_client_id"),
                    client_secret:clientSecret,
                    refresh_token:this.auth.refresh_token,
                    grant_type:"refresh_token"
                })
            }
        );
        const data = await resp.json();
        if(!resp.ok){
            throw new Error(data.error || "Refresh failed");
        }
        this.auth.access_token = data.access_token;
        this.auth.expiry = Date.now() + (data.expires_in * 1000);
        if(data.refresh_token){
            this.auth.refresh_token = data.refresh_token;
        }
        localStorage.setItem(
            "google_calendar_token",
            JSON.stringify(this.auth)
        );
        return this.auth.access_token;
    },

    async syncToGoogle(){
        const token = await this.ensureToken();

        for(const event of events){
            const exceptionDates = Object.keys(event.exceptions || {})
                .filter(k => event.exceptions[k] !== null);

            const gcalEvent = {
                summary:event.title,
                description:event.notes || "",
                location:event.location || "",
                start:{
                    date:event.date,
                    time:event.time ? {
                        hour:parseInt(event.time.split(":")[0]),
                        minute:parseInt(event.time.split(":")[1] || "0")
                    } : undefined
                },
                end:{
                    date:event.date,
                    time:event.time ? {
                        hour:parseInt(event.time.split(":")[0]),
                        minute:parseInt(event.time.split(":")[1] || "0")
                    } : undefined
                },
                colorId: this._colorToGoogle(event.color)
            };

            if(event.recurrence !== "none"){
                const recur = this._buildIcalRecurrence(event);
                if(recur.recurrenceRules && recur.recurrenceRules.length > 0){
                    gcalEvent.recurrence = recur.recurrenceRules;
                }
                if(exceptionDates.length > 0){
                    gcalEvent.exceptions = exceptionDates.map(d => ({
                        date:d,
                        detail: this._exceptionToJson(event.exceptions[d])
                    }));
                }
            }

            try{
                const existing = await this._findGoogleEvent(event.id);
                if(existing){
                    await this._updateGoogleEvent(existing.id, gcalEvent, token);
                } else {
                    await this._createGoogleEvent(gcalEvent, token);
                }
            } catch(err){
                console.error("GCal sync error for", event.id, err);
            }
        }

        alert("Google Calendar sync complete.");
    },

    _colorToGoogle(color){
        const map = {
            "gray":"8", "red":"1", "blue":"2",
            "green":"4", "purple":"5"
        };
        return map[color] || "8";
    },

    _buildIcalRecurrence(event){
        if(event.recurrence === "none"){
            return { recurrenceRules:[] };
        }
        const rules = {
            freq: event.recurrence,
            until: event.recurrenceEnd || undefined
        };
        return { recurrenceRules:[rules] };
    },

    _exceptionToJson(exc){
        if(!exc) return null;
        return {
            title:exc.title,
            time:exc.time,
            location:exc.location,
            notes:exc.notes
        };
    },

    async _findGoogleEvent(localId){
        const token = await this.ensureToken();
        const resp = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?showDeleted=true",
            {
                headers:{
                    Authorization:`Bearer ${token}`
                }
            }
        );
        if(!resp.ok) return null;
        const data = await resp.json();
        return (data.items || []).find(
            e => e.extendedProperties?.private?.["aegis_id"] === String(localId)
        ) || null;
    },

    async _createGoogleEvent(eventData, token){
        const payload = {
            ...eventData,
            extendedProperties:{
                private:{
                    "aegis_id": String(eventData.id || eventData.summary)
                }
            }
        };
        delete payload.id;
        const resp = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
                method:"POST",
                headers:{
                    Authorization:`Bearer ${token}`,
                    "Content-Type":"application/json"
                },
                body: JSON.stringify(payload)
            }
        );
        if(!resp.ok){
            const err = await resp.json();
            throw new Error(err.message || "Create failed");
        }
    },

    async _updateGoogleEvent(googleEventId, eventData, token){
        const payload = {
            ...eventData,
            extendedProperties:{
                private:{
                    "aegis_id": String(eventData.id || eventData.summary)
                }
            },
            id: googleEventId
        };
        delete payload.id;
        const resp = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
            {
                method:"PATCH",
                headers:{
                    Authorization:`Bearer ${token}`,
                    "Content-Type":"application/json"
                },
                body: JSON.stringify(payload)
            }
        );
        if(!resp.ok){
            const err = await resp.json();
            throw new Error(err.message || "Update failed");
        }
    },

    disconnect(){
        this.auth = null;
        localStorage.removeItem("google_calendar_token");
        this._updateUI();
        alert("Disconnected from Google Calendar.");
    },

    isConnected(){
        return !!this.auth;
    },

    _updateUI(){
        const connectBtn = document.getElementById("gcalConnectBtn");
        const syncBtn = document.getElementById("gcalSyncBtn");
        const disconnectBtn = document.getElementById("gcalDisconnectBtn");
        const status = document.getElementById("gcalStatus");

        if(connectBtn){
            connectBtn.style.display = this.auth ? "none" : "inline-block";
        }
        if(syncBtn){
            syncBtn.disabled = !this.auth;
            syncBtn.style.cursor = this.auth ? "pointer" : "not-allowed";
        }
        if(disconnectBtn){
            disconnectBtn.disabled = !this.auth;
            disconnectBtn.style.cursor = this.auth ? "pointer" : "not-allowed";
        }
        if(status){
            status.textContent = this.auth
                ? "Connected to Google Calendar"
                : "Not connected to Google Calendar.";
            status.style.color = this.auth ? "#4caf50" : "#888";
        }
    },

    _onConnected(){
        this._updateUI();
        Aegis.broadcast("googleCalendarConnected");
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
