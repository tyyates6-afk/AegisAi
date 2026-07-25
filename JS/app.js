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