let reminders = loadData("reminders") || [];



async function loadRemindersFromCloud(){

    const cloud =
    Aegis
    .getModule("cloud")
    .api;


    const cloudReminders =
    await cloud.load(
        "reminders"
    );


    if(cloudReminders.length === 0){

        return;

    }


    reminders =
    cloudReminders;


    saveData(
        "reminders",
        reminders
    );


    displayReminders();


    console.log(
        "Reminders loaded from cloud."
    );

}

async function syncRemindersToCloud(){

    const cloud =
    Aegis
    .getModule("cloud")
    .api;


    for(const reminder of reminders){

        await cloud.save(
            "reminders",
            reminder
        );

    }


    console.log(
        "Reminders synced."
    );

}

function addReminder(){


    const task =
    document.getElementById(
    "reminderInput"
    ).value;


    const date =
    document.getElementById(
    "reminderDate"
    ).value;


    const time =
    document.getElementById(
    "reminderTime"
    ).value;



    if(!task || !date){

    alert(
    "Please enter a task and date."
    );

    return;

    }



    const reminder = {

    id: Date.now(),

    task: task,

    date: date,

    time: time || "00:00",

    completed: false,
    
    completed_at: null
    
    };

    const exists =
    reminders.some(item =>
        item.task === task &&
        item.date === date &&
        item.time === time
    );


    if(exists){

        alert("This reminder already exists.");

        return;

    }

    reminders.push(reminder);



    saveData(
    "reminders",
    reminders
    );


    displayReminders();


    syncRemindersToCloud();


    Aegis.broadcast("remindersUpdated");

}



function deleteReminder(id){


    reminders =
    reminders.filter(
    (reminder)=>
    reminder.id !== id
    );



    saveData(
    "reminders",
    reminders
    );


    syncRemindersToCloud();


    displayReminders();


    Aegis.broadcast("remindersUpdated");

}



function displayReminders(){


    const list =
    document.getElementById("reminderList");

    if (!list) return;

    list.innerHTML = "";

    reminders.forEach(
    (reminder)=>{


    const div =
    document.createElement(
    "div"
    );
    div.dataset.id =
    reminder.id;



    div.className =
    reminder.completed
    ? "reminder-item completed"
    : "reminder-item";



    div.innerHTML = `
    <strong>

    ${reminder.completed ? "✅" : "⬜"}

    ${reminder.task}

    </strong>
    

    <br>

    📅 ${reminder.date}

    <br>

    ⏰ ${reminder.time || "No time set"}

    <br><br>
    
    <button onclick="toggleReminderComplete(${reminder.id})">

    ${reminder.completed ? "Mark Incomplete" : "Mark Complete"}

    </button>

    <button onclick="deleteReminder(${reminder.id})">

    Delete

    </button>

    <hr>

    `;



    list.appendChild(div);



    });

    
}

function toggleReminderComplete(id){

    const reminder = reminders.find(r => r.id === id);

    if(!reminder) return;

    reminder.completed = !reminder.completed;

    reminder.completed_at =
        reminder.completed
        ? new Date().toISOString()
        : null;

    saveData(
        "reminders",
        reminders
    );

    syncRemindersToCloud();

    displayReminders();


    const completedItem =
    document.querySelector(
        `.reminder-item[data-id="${id}"]`
    );


    if(completedItem && reminder.completed){

        completedItem.classList.add(
            "just-completed"
        );

        setTimeout(()=>{

            completedItem.classList.remove(
                "just-completed"
            );

        },800);

    }


    Aegis.broadcast("remindersUpdated");

}


Aegis.register("reminders", {

    version: "1.1.5",

    init() {

        reminders = loadData("reminders") || [];

        displayReminders();

        loadRemindersFromCloud();

        console.log("Reminders initialized.");

    },

    refresh() {

        reminders = loadData("reminders");

        displayReminders();

    },

    getTodaysReminders() {

        reminders = loadData("reminders");

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


        return reminders.filter(reminder => {

            return reminder.date === today;

        });

    },

    shutdown() {

        console.log("Reminders shutting down.");

    },

    status() {

        return {

            online: true,

            version: this.version

        };

    }

});