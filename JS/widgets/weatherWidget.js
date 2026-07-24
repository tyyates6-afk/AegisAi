Dashboard.register("weather", {


    init(){

        this.refresh();

    },


    refresh(){


        const container =
        document.getElementById(
            "weather"
        );


        if(!container) return;



        const weatherModule =
        Aegis.getModule("weather");



        if(!weatherModule){

            container.innerHTML = `

            <h3>
            🌤️ Weather
            </h3>

            <p>
            Weather unavailable.
            </p>

            `;

            return;

        }



        const weather =
        weatherModule.api.getWeather();



        if(!weather){


            container.innerHTML = `

            <div class="widget-header">
                <h3>
                    🌤️ Weather
                </h3>
            </div>

            <p class="empty-state">
            Loading weather...
            </p>

            `;


            return;

        }



        const profile =
        Aegis.getModule("profile")
        .api
        .getProfile();



        let temperature =
        weather.temperature;



        if(profile.temperature === "F"){

            temperature =
            (temperature * 9/5) + 32;

            temperature =
            Math.round(temperature);

        }
        else {

            temperature =
            Math.round(temperature);

        }



        container.innerHTML = `


        <div class="widget-header">

            <h3>
            🌤️ Weather
            </h3>

        </div>


        <div class="widget-body">


            <div class="widget-item">

                <strong>
                Temperature
                </strong>

                ${temperature}°${profile.temperature || "F"}

            </div>


            <div class="widget-item">

                <strong>
                Wind
                </strong>

                ${weather.wind} km/h

            </div>


            <div class="widget-item">

                <strong>
                Location
                </strong>

                ${profile.city}, ${profile.state}

            </div>


        </div>


        `;


    },


    shutdown(){


    }


});



Dashboard.listen(
    "weatherUpdated",
    "weather"
);