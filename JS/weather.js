let weatherData = null;
let weatherAlerts =
loadData("weatherAlerts") || {};

function cleanupWeatherAlerts(){

    const now =
    Date.now();


    const threeDays =
    1000 *
    60 *
    60 *
    24 *
    3;


    Object.keys(weatherAlerts)
    .forEach(id=>{


        if(
            now -
            weatherAlerts[id]
            >
            threeDays
        ){

            delete weatherAlerts[id];

        }


    });


    saveData(
        "weatherAlerts",
        weatherAlerts
    );

}

function checkWeatherNotifications(weather){

    cleanupWeatherAlerts();
    
    if(!weather){
        return;
    }


    const today =
    new Date()
    .toISOString()
    .split("T")[0];



    function sendWeatherAlert(
        id,
        data
    ){

        if(weatherAlerts[id]){
            return;
        }


        Aegis
        .getModule("notifications")
        .api
        .notify(data);



        weatherAlerts[id] =
        Date.now();


        saveData(
            "weatherAlerts",
            weatherAlerts
        );

    }



    if(weather.temperature >= 100){


        sendWeatherAlert(

            "heat-" + today,

            {

            title:"Extreme Heat Warning",

            message:
            `Temperature is currently ${weather.temperature} degrees.`,

            icon:"☀️",

            source:"weather",

            speak:true

            }

        );

    }



    if(weather.wind >= 40){


        sendWeatherAlert(

            "wind-" + today,

            {

            title:"High Wind Alert",

            message:
            `Wind speeds are currently ${weather.wind} miles per hour.`,

            icon:"🌬️",

            source:"weather",

            speak:true

            }

        );

    }


}
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
    checkWeatherNotifications(
        weatherData
    );
        

        Aegis.broadcast(
            "weatherUpdated"
        );

        

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

