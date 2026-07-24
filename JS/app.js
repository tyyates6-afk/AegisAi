function getGreeting(){

    const hour = new Date().getHours();


    if(hour < 12){

        return "Good Morning";

    }

    else if(hour < 18){

        return "Good Afternoon";

    }

    else{

        return "Good Evening";

    }

}



function updateDashboard(){


    const profile =
    loadData("profile")[0] || {name:"User"};



    const now =
    new Date();



    const date =
    now.toLocaleDateString(
        undefined,
        {
            weekday:"long",
            year:"numeric",
            month:"long",
            day:"numeric"
        }
    );



    const time =
    now.toLocaleTimeString();



    document.getElementById(
        "status"
    ).innerHTML = `

    ${getGreeting()}, 
    ${profile.name || "User"}.

    <br><br>

    ${date}

    <br>

    ${time}

    <br><br>

    SYSTEM STATUS:
    ONLINE

    `;


}



updateDashboard();



setInterval(
    updateDashboard,
    1000
);

if ("serviceWorker" in navigator) {

window.addEventListener("load", () => {

navigator.serviceWorker.register("service-worker.js")

.then(() => {

console.log("✓ Service Worker Registered");

})

.catch(err => {

console.error(err);

});

});

}