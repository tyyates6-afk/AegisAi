function generateBriefing(){


const profile =
loadData("profile")[0] || 
{name:"User"};



const today =
new Date()
.toISOString()
.split("T")[0];



const events =
loadData("calendarEvents")
.filter(
event =>
event.start === today
);



const reminders =
loadData("reminders")
.filter(
reminder =>
reminder.date === today
);



let output = `

Good Morning, ${profile.name}.

<br><br>

<strong>📅 Today's Schedule</strong>

<br>

`;



if(events.length === 0){

output +=
"No events scheduled.";

}

else{


events.forEach(event=>{

output +=
`• ${event.title}<br>`;

});


}



output += `

<br>

<strong>🔔 Today's Reminders</strong>

<br>

`;



if(reminders.length === 0){

output +=
"No reminders today.";

}

else{


reminders.forEach(reminder=>{

output +=
`• ${reminder.task} ${reminder.time || ""}<br>`;

});


}



document.getElementById(
"briefing"
).innerHTML =
output;


}




Aegis.register("briefing", {

    version: "1.1.5",

    init() {

        console.log("Briefing initialized.");

        generateBriefing();

    },

    refresh() {

        generateBriefing();

    },

    shutdown() {},

    status() {

        return {

            online: true,

            version: this.version

        };

    }

});