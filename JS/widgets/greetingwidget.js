function updateGreetingWidget() {

    const now = new Date();

    let greeting = "Good Evening";

    if (now.getHours() < 12) {

        greeting = "Good Morning";

    } else if (now.getHours() < 18) {

        greeting = "Good Afternoon";

    }

    const profile = loadData("profile")[0] || {};
    const name = profile.name || "there";

    document.getElementById("greeting").textContent =
        `${greeting}, ${name}.`;

    document.getElementById("currentDate").textContent =
        now.toLocaleDateString(undefined, {

            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"

        });

    document.getElementById("currentTime").textContent =
        now.toLocaleTimeString();

}