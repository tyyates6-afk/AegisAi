let reminders =
loadData("reminders");



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

time: time

};



reminders.push(reminder);



saveData(
"reminders",
reminders
);



displayReminders();



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


}



function displayReminders(){


const list =
document.getElementById(
"reminderList"
);



list.innerHTML="";



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

        console.log("Reminders initialized.");

    },

    refresh() {

        displayReminders();

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