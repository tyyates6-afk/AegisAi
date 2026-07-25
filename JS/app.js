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


if ("serviceWorker" in navigator) {

window.addEventListener("load", () => {

navigator.serviceWorker.register("JS/service-worker.js")

.then(() => {

console.log("✓ Service Worker Registered");

})

.catch(err => {

console.error(err);

});

});

}