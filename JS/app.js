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

navigator.serviceWorker.register("service-worker.js")

.then(() => {

console.log("✓ Service Worker Registered");

})

.catch(err => {

console.error(err);

});

});

}


async function fullRefresh(){

    console.log(
        "Performing full AEGIS refresh..."
    );

    try{

        if("caches" in window){

            const keys =
            await caches.keys();

            await Promise.all(
                keys.map(
                    key => caches.delete(key)
                )
            );

            console.log(
                "All caches cleared."
            );

        }

        if("serviceWorker" in navigator){

            const registrations =
            await navigator
            .serviceWorker
            .getRegistrations();

            await Promise.all(
                registrations.map(
                    registration =>
                    registration.unregister()
                )
            );

            console.log(
                "Service worker unregistered."
            );

        }

    }
    catch(error){

        console.error(
            "Full refresh failed:",
            error
        );

    }

    location.reload();

}

window.fullRefresh = fullRefresh;