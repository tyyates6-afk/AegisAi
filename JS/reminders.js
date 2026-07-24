let reminders = loadData("reminders") || [];

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

    time: time || "00:00"

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



    div.className =
    "reminder-item";



    div.innerHTML = `

    <strong>
    🔔 ${reminder.task}
    </strong>

    <br>

    📅 ${reminder.date}

    <br>

    ⏰ ${reminder.time || "No time set"}

    <br><br>

    <button onclick="deleteReminder(${reminder.id})">

    Delete

    </button>

    <hr>

    `;



    list.appendChild(div);



    });

    
}




Aegis.register("reminders", {

    version: "1.1.5",

    init() {

        reminders = loadData("reminders");

        displayReminders();

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