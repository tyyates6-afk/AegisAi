let events = loadData("events");

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

        notifications:event.notifications || []

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
            event
        );

    }

    console.log(
        "Events synced."
    );

}

let selectedEventDate = "";



function setEventDate(date){

    selectedEventDate = date;

    document.getElementById(
        "eventDate"
    ).value = date;

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
    categoryInfo
    ?
    categoryInfo.color
    :
    "gray",

    date:date,

    time:time,

    location:location,

    notes:notes,

    notifications:notifications
    
    

};



    events.push(newEvent);



    saveData(
        "events",
        events
    );



    displayEvents();

    clearEventForm();

    syncEventsToCloud();

    Aegis.broadcast("eventsUpdated");
    

}



function deleteEvent(id){


    events =
    events.filter(
        event =>
        event.id !== id
    );



    saveData(
        "events",
        events
    );

    syncEventsToCloud();

    displayEvents();
    
    Aegis.broadcast("eventsUpdated");

}




function displayEvents(){


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



        div.innerHTML = `


        <strong>
        📅 ${event.title}
        </strong>

        <br>

        ${categoryName}

        <br>

        ${event.date}

        ${event.time || ""}


        <br>

        ${event.location || ""}


        <br><br>


        <button onclick="editEvent(${event.id})">

        Edit

        </button>


        <button onclick="deleteEvent(${event.id})">

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


    document
    .querySelectorAll(
    "#eventNotifications input"
    )
    .forEach(box => {

        box.checked = false;

    });


}

let editingEvent = null;



function editEvent(id){


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

    
}



function saveEventChanges(){


    if(!editingEvent)
    return;



    editingEvent.title =
    document.getElementById(
        "eventTitle"
    ).value;



    editingEvent.categoryId =
    document.getElementById(
        "eventCategory"
    ).value;



    editingEvent.date =
    document.getElementById(
        "eventDate"
    ).value;



    editingEvent.time =
    document.getElementById(
        "eventTime"
    ).value;



    editingEvent.location =
    document.getElementById(
        "eventLocation"
    ).value;



    editingEvent.notes =
    document.getElementById(
        "eventNotes"
    ).value;


    editingEvent.notifications = [];

    document.querySelectorAll(
    "#eventNotifications input:checked"
    )
    .forEach(box=>{

        editingEvent.notifications.push(
            Number(box.value)
        );

    });

    



    saveData(
        "events",
        events
    );

    syncEventsToCloud();

    editingEvent = null;


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

displayEvents();

if(window.refreshCalendar){

window.refreshCalendar();

}

Aegis.register("events", {

    version: "1.1.5",

    init(){

        loadEventsFromCloud();

        console.log(
            "Events initialized."
        );
        
        Aegis.listen("categoriesUpdated", () => {

            updateCategoryMenus();

        });
    },

    refresh(){

        displayEvents();

        loadEventsFromCloud();

    },

    getTodaysEvents() {

        const now = new Date();

        const year =
        now.getFullYear();

        const month =
        String(now.getMonth() + 1)
        .padStart(2, "0");

        const day =
        String(now.getDate())
        .padStart(2, "0");

        const today =
        `${year}-${month}-${day}`;

        return events.filter(event => {

            return event.date === today;

        });

    },

    shutdown() {

        console.log("Events shutting down.");

    },

    status() {

        return {
            online: true,
            version: this.version
        };

    }

});

window.loadEventsFromCloud =
loadEventsFromCloud;