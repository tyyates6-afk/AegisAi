let weatherData = null;


async function loadWeather(){

    console.log("loadWeather() called");

    const profile =
    Aegis.getModule("profile")
    .api
    .getProfile();

    console.log(profile);


    if(
        !profile.city ||
        !profile.country
    ){
        console.log(
        "City:", profile.city,
        "Country:", profile.country
    );
        console.log(
            "Weather waiting for location."
        );

        return;

    }



    try{


        // Get coordinates

        const geoResponse =
        await fetch(

        `https://geocoding-api.open-meteo.com/v1/search?name=${profile.city}&count=1`

        );


        const geoData =
        await geoResponse.json();



        if(!geoData.results){

            console.error(
            "Location not found."
            );

            return;

        }



        const location =
        geoData.results[0];



        const lat =
        location.latitude;


        const lon =
        location.longitude;



        // Get weather


        const weatherResponse =
        await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        {
            cache:"no-store"
        }
        );



        const data =
            await weatherResponse.json();



            if(!data.current_weather){

        console.error(
            "Weather data unavailable.",
            data
        );

        return;

    }


    weatherData = {


        temperature:
        data.current_weather.temperature,


        wind:
        data.current_weather.windspeed,


        updated:
        new Date()
        
    };
    console.log("Weather data saved:", weatherData);


        Aegis.broadcast(
            "weatherUpdated"
        );

        console.log("Weather broadcast sent");
        console.log("Weather loaded:", weatherData);

        Dashboard.refresh("weather"); 
    }


    catch(error){

        console.error(
            "Weather error:",
            error
        );

    }
    
}

Aegis.register("weather", {


    version:"1.1.5",


    


    getWeather(){

        return weatherData;

    },

    



    init(){

    console.log(
    "Weather initialized."
    );

    loadWeather();

    setInterval(() => {

        loadWeather();

    }, 1800000);


    
},


    refresh(){

        loadWeather();

    },


    shutdown(){},


    status(){

        return{

            online:true,

            version:this.version

        };

    }


});

