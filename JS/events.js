let events = loadData("events");


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



    const category =
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



    const reminder =
    document.getElementById(
        "eventReminder"
    ).checked;



    if(!title || !date){

        alert(
        "Event name and date required."
        );

        return;

    }



    const categoryInfo =
categories.find(
item => item.name === category
);



const newEvent = {


    id: Date.now(),

    title:title,

    category:category,

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

    reminder:reminder


};



    events.push(newEvent);



    saveData(
        "events",
        events
    );



    displayEvents();

    clearEventForm();

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


    displayEvents();

}




function displayEvents(){


    const list =
    document.getElementById(
        "eventList"
    );


    if(!list) return;



    list.innerHTML = "";



    events.forEach(event => {



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

        ${event.category}

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


document.getElementById(
"eventReminder"
).checked=false;


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
    editingEvent.category;



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
        "eventReminder"
    ).checked =
    editingEvent.reminder;



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



    editingEvent.category =
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



    editingEvent.reminder =
    document.getElementById(
        "eventReminder"
    ).checked;



    saveData(
        "events",
        events
    );


    editingEvent = null;


    document.getElementById(
        "saveEventButton"
    ).innerText =
    "Save Event";


    displayEvents();


    if(window.refreshCalendar){

        window.refreshCalendar();

    }


}

displayEvents();

if(window.refreshCalendar){

window.refreshCalendar();

}

Aegis.register("events", {

    version: "1.1.5",

    init() {

        console.log("Events initialized.");

    },

    refresh() {

        displayEvents();

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