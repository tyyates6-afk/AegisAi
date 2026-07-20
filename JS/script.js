const reminders = [];

function addReminder(){

    const input =
        document.getElementById("reminderInput");

    if(input.value==="") return;

    reminders.push(input.value);

    displayReminders();

    input.value="";
}

function displayReminders(){

    const list =
        document.getElementById("reminderList");

    list.innerHTML="";

    reminders.forEach(reminder=>{

        const li=document.createElement("li");

        li.textContent=reminder;

        list.appendChild(li);

    });

}