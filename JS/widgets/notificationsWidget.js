Dashboard.register("notifications", {


init(){

    this.refresh();

},



refresh(){


const container =
document.getElementById(
"notifications"
);


if(!container) return;



const notifications =
(loadData("notifications") || [])
.filter(notification => !notification.dismissed);


if(notifications.length === 0){

container.innerHTML = `

<div class="widget-header">
    <h3>
        🔔 Notifications
    </h3>
</div>

<p class="empty-state">
No notifications.
</p>

`;

return;

}



let html = `
<div class="widget-header">
    <h3>
        🔔 Notifications
    </h3>
</div>
`;



notifications
.slice(-5)
.reverse()
.forEach(notification=>{


html += `

<div class="notification-item">

<strong>
${notification.title}
</strong>

<br>

${notification.message}

<br>

<small>
${notification.category}
</small>


<button onclick="clearNotification(${notification.id})">

Dismiss

</button>


</div>

`;

});



html += `

<button onclick="clearAllNotifications()">

Clear All

</button>

`;



container.innerHTML = html;


}



});



function clearNotification(id){

let notifications =
loadData("notifications") || [];


notifications =
notifications.map(notification=>{

    if(notification.id === id){

        notification.dismissed = true;

    }

    return notification;

});


saveData(
"notifications",
notifications
);


Dashboard.refresh(
"notifications"
);

}



function clearAllNotifications(){

let notifications =
loadData("notifications") || [];


notifications =
notifications.map(notification=>{

    notification.dismissed = true;

    return notification;

});


saveData(
"notifications",
notifications
);


Dashboard.refresh(
"notifications"
);

}