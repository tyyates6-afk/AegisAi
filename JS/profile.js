let profile = 
    loadData("profile")[0] || {}


function saveProfile(){

    const name =
    document.getElementById("userName").value;


    const bible =
    document.getElementById("bibleVersion").value;


    const style =
    document.getElementById("assistantStyle").value;

    const city =
    document.getElementById("userCity").value;

    const state =
    document.getElementById("userState").value;

    const country =
    document.getElementById("userCountry").value;

    const temperature =
    document.getElementById("temperatureUnit").value;


    profile = {

        name: name,

        city: city,

        state: state,

        country: country,

        temperature: temperature,

        bible: bible,

        style: style,
        
        latitude:null,

        longitude:null,
    };


    saveData(
        "profile",
        [profile]
    );


    document.getElementById(
        "profileStatus"
    ).innerText =
    "Profile Saved.";


    console.log(
        "Profile saved:",
        profile
    );


    Aegis.broadcast(
        "profileUpdated"
    );

}



function loadProfile(){


if(profile.name){


document.getElementById(
"userName"
).value =
profile.name;


document.getElementById(
"bibleVersion"
).value =
profile.bible;


document.getElementById(
"assistantStyle"
).value =
profile.style;

document.getElementById(
"userCity"
).value =
profile.city || "";

document.getElementById(
"userState"
).value =
profile.state || "";

document.getElementById(
"userCountry"
).value =
profile.country || "";

document.getElementById(
"temperatureUnit"
).value =
profile.temperature || "F";

}


}



Aegis.register("profile", {

    version: "1.1.5",

    init() {
        
        
        console.log("Profile initialized.");

    },

    refresh() {

        loadProfile();

    },

    getProfile() {

        const profile = loadData("profile");

        if (profile.length === 0) {

            return {

            name: "there",

            city: "",

            state: "",

            country: "",

            temperature: "F",

            bible: "NIV",

            style: "Professional"

        };

    }

        return profile[0];

    },

    shutdown() {

        console.log("Profile shutting down.");

    },

    status() {

        return {
            online: true,
            version: this.version
        };

    }

});