Dashboard.register("notifications", {
    title:
    "Notifications",

    icon:
    "🔔",

    description:
    "Important AEGIS alerts and updates",

    category:
    "system",

    size:
    "small-card",

    movable:
    true,

    removable:
    true,

    resizable:
    true,
    dismiss(id){

        const notification =
        notifications.find(
            n => n.id === id
        );

        if(notification){

            notification.dismissed = true;

            saveData(
                "notifications",
                notifications
            );

        }

        Aegis.broadcast(
            "notificationsUpdated"
        );

    },


    clearAll(){

        notifications =
        notifications.map(notification=>{

            notification.dismissed = true;

            return notification;

        });


        saveData(
            "notifications",
            notifications
        );


        Aegis.broadcast(
            "notificationsUpdated"
        );

    },
    init(){

        this.refresh();

    },



    refresh(){

        const container =
        document.getElementById(
            "notifications"
        );

        if(!container){
            return;
        }

        const notifications =
        Aegis
        .getModule("notifications")
        .api
        .getNotifications()
        .filter(
            notification => !notification.dismissed
        );

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

        const unread =
        notifications.filter(
            notification =>
            !notification.read
        ).length;

        let html = `

        <div class="widget-header">

            <h3>

                🔔 Notifications (${unread})

            </h3>

        </div>

        `;

        notifications
        .slice(0,5)
        .forEach(notification=>{

            html += `

            <div
            class="notification-item"
            data-id="${notification.id}">

                <strong>

                    ${notification.icon}
                    ${notification.title}

                </strong>

                <br>

                ${notification.message}

                <br>

                <small>

                    ${notification.source}

                </small>

                <br><br>

                <button
                onclick="event.stopPropagation(); dismissNotification('${notification.id}')">

                    Dismiss

                </button>

            </div>

            `;

        });

        container.innerHTML = html;

        container.innerHTML += `

        <button onclick="clearAllNotifications()">

            Clear All

        </button>

        `;
        container
        .querySelectorAll(
            ".notification-item"
        )
        .forEach(card=>{

            card.onclick = ()=>{

                Aegis
                .getModule("notifications")
                .api
                .markRead(
                    card.dataset.id
                );

            };

        });

    }



});
function dismissNotification(id){

    Aegis
    .getModule("notifications")
    .api
    .dismiss(id);

}



function clearAllNotifications(){

    Aegis
    .getModule("notifications")
    .api
    .clearAll();

}


